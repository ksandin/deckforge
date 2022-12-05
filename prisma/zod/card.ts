import * as z from "zod"
import { CompleteDeck, relatedDeckType } from "./index"

export const cardType = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string(),
  deckId: z.string(),
})

export interface CompleteCard extends z.infer<typeof cardType> {
  deck: CompleteDeck
}

/**
 * relatedCardType contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const relatedCardType: z.ZodSchema<CompleteCard> = z.lazy(() => cardType.extend({
  deck: relatedDeckType,
}))