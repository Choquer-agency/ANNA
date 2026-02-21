import { defineType, defineArrayMember } from 'sanity'

export const blockContent = defineType({
  name: 'blockContent',
  title: 'Block Content',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'H2', value: 'h2' },
        { title: 'H3', value: 'h3' },
        { title: 'H4', value: 'h4' },
        { title: 'Quote', value: 'blockquote' },
      ],
      lists: [
        { title: 'Bullet', value: 'bullet' },
        { title: 'Number', value: 'number' },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          { title: 'Underline', value: 'underline' },
          { title: 'Code', value: 'code' },
        ],
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [
              {
                name: 'href',
                type: 'url',
                title: 'URL',
                validation: (rule) =>
                  rule.uri({ allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel'] }),
              },
              {
                name: 'blank',
                type: 'boolean',
                title: 'Open in new tab',
                initialValue: true,
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt text',
          description: 'Describe the image for accessibility',
        },
        {
          name: 'caption',
          type: 'string',
          title: 'Caption',
        },
      ],
    }),
    defineArrayMember({
      type: 'object',
      name: 'comparisonTable',
      title: 'Comparison Table',
      fields: [
        {
          name: 'columns',
          type: 'array',
          title: 'Column Headers',
          of: [{ type: 'string' }],
        },
        {
          name: 'rows',
          type: 'array',
          title: 'Rows',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'cells', type: 'array', title: 'Cell values', of: [{ type: 'string' }] },
              ],
            },
          ],
        },
        {
          name: 'highlightRow',
          type: 'number',
          title: 'Highlight Row Index (0-based)',
          description: 'Optionally highlight a row (e.g. 0 for the first data row)',
        },
      ],
    }),
  ],
})
