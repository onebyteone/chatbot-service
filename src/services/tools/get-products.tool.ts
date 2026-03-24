import { tool } from '@openrouter/sdk';
import { z } from 'zod';
import { searchProducts } from '../products.service';

export const getProductsTool = tool({
  name: 'get_products',
  description:
    'Consulta productos reales de Yuntas Publicidad. Permite buscar por nombre, texto libre o categoria y devuelve resultados resumidos con paginacion.',
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe('Texto de busqueda libre. Ejemplo: "holograficos", "letreros"'),
    category: z
      .string()
      .optional()
      .describe('Nombre o slug de categoria. Ejemplo: "iluminacion-led"'),
    page: z.number().int().min(1).optional().describe('Pagina de resultados a consultar'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe('Cantidad maxima de productos en la respuesta (1-20)'),
  }),
  outputSchema: z.object({
    items: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
        heroTitle: z.string().nullable(),
        description: z.string().nullable(),
        status: z.string().nullable(),
        categories: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            slug: z.string(),
          })
        ),
        keywords: z.array(z.string()),
        imageUrl: z.string().nullable(),
      })
    ),
    pagination: z.object({
      page: z.number(),
      lastPage: z.number(),
      total: z.number().optional(),
      perPage: z.number().optional(),
      hasNextPage: z.boolean(),
    }),
  }),
  execute: async (params) => {
    return await searchProducts(params);
  },
});
