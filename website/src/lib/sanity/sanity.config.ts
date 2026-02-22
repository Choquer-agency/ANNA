import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'
import { sanityConfig } from './config'

export default defineConfig({
  name: 'anna-blog',
  title: 'Anna Blog',
  projectId: sanityConfig.projectId,
  dataset: sanityConfig.dataset,
  plugins: [structureTool()],
  schema: { types: schemaTypes },
})
