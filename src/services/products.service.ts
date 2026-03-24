import { z } from 'zod';

const PRODUCTS_API_URL = 'https://apiyuntas.yuntaspublicidad.com/api/productos';
const API_ORIGIN = 'https://apiyuntas.yuntaspublicidad.com';
const CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const MAX_FETCH_PAGES = 5;

const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional().nullable(),
  hero_title: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional().nullable(),
  main_image: z
    .object({
      url: z.string().optional().nullable(),
      alt: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  categories: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
      })
    )
    .optional()
    .nullable(),
});

const ProductsApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    data: z.array(ProductSchema),
    links: z
      .object({
        next: z.string().nullable(),
      })
      .optional(),
    meta: z.object({
      current_page: z.number(),
      last_page: z.number(),
      per_page: z.number().optional(),
      total: z.number().optional(),
    }),
  }),
});

export type ProductSearchParams = {
  query?: string;
  category?: string;
  page?: number;
  limit?: number;
};

export type ProductSummary = {
  id: number;
  name: string;
  slug: string;
  heroTitle: string | null;
  description: string | null;
  status: string | null;
  categories: Array<{ id: number; name: string; slug: string }>;
  keywords: string[];
  imageUrl: string | null;
};

export type ProductSearchResult = {
  items: ProductSummary[];
  pagination: {
    page: number;
    lastPage: number;
    total?: number;
    perPage?: number;
    hasNextPage: boolean;
  };
};

type CachedPage = {
  expiresAt: number;
  data: z.infer<typeof ProductsApiResponseSchema>;
};

const pageCache = new Map<number, CachedPage>();

function normalizeText(value?: string | null): string {
  if (!value) return '';
  return value.trim().toLowerCase();
}

function buildAbsoluteImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function mapProduct(product: z.infer<typeof ProductSchema>): ProductSummary {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    heroTitle: product.hero_title ?? null,
    description: product.description ?? null,
    status: product.status ?? null,
    categories: product.categories ?? [],
    keywords: (product.keywords ?? []).map((k) => k.trim()).filter(Boolean),
    imageUrl: buildAbsoluteImageUrl(product.main_image?.url),
  };
}

async function fetchJsonWithRetry(url: string): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Productos API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      if (attempt <= MAX_RETRIES) {
        const backoffMs = 300 * attempt;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`No se pudo consultar productos: ${String(lastError)}`);
}

async function getProductsPage(page: number): Promise<z.infer<typeof ProductsApiResponseSchema>> {
  const cached = pageCache.get(page);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const url = `${PRODUCTS_API_URL}?page=${page}`;
  const rawData = await fetchJsonWithRetry(url);
  const parsed = ProductsApiResponseSchema.parse(rawData);

  if (!parsed.success) {
    throw new Error('La API de productos devolvio success=false');
  }

  pageCache.set(page, {
    expiresAt: now + CACHE_TTL_MS,
    data: parsed,
  });

  return parsed;
}

function productMatches(product: ProductSummary, queryText: string, categoryText: string): boolean {
  const matchesQuery =
    !queryText ||
    normalizeText(product.name).includes(queryText) ||
    normalizeText(product.slug).includes(queryText) ||
    normalizeText(product.heroTitle).includes(queryText) ||
    normalizeText(product.description).includes(queryText) ||
    product.keywords.some((keyword) => normalizeText(keyword).includes(queryText));

  const matchesCategory =
    !categoryText ||
    product.categories.some(
      (category) =>
        normalizeText(category.name).includes(categoryText) ||
        normalizeText(category.slug).includes(categoryText)
    );

  return matchesQuery && matchesCategory;
}

export async function searchProducts(params: ProductSearchParams): Promise<ProductSearchResult> {
  const queryText = normalizeText(params.query);
  const categoryText = normalizeText(params.category);
  const requestedPage = params.page ?? 1;
  const limit = Math.max(1, Math.min(params.limit ?? 5, 20));

  const firstResponse = await getProductsPage(requestedPage);
  let products = firstResponse.data.data.map(mapProduct);

  const shouldScanExtraPages = !params.page && (queryText.length > 0 || categoryText.length > 0);

  if (shouldScanExtraPages) {
    const lastPage = Math.min(firstResponse.data.meta.last_page, MAX_FETCH_PAGES);
    const pagePromises: Array<Promise<z.infer<typeof ProductsApiResponseSchema>>> = [];

    for (let page = requestedPage + 1; page <= lastPage; page += 1) {
      pagePromises.push(getProductsPage(page));
    }

    const extraResponses = await Promise.all(pagePromises);
    for (const response of extraResponses) {
      products = products.concat(response.data.data.map(mapProduct));
    }
  }

  const filtered = products.filter((product) => productMatches(product, queryText, categoryText));

  return {
    items: filtered.slice(0, limit),
    pagination: {
      page: firstResponse.data.meta.current_page,
      lastPage: firstResponse.data.meta.last_page,
      total: firstResponse.data.meta.total,
      perPage: firstResponse.data.meta.per_page,
      hasNextPage: Boolean(firstResponse.data.links?.next),
    },
  };
}