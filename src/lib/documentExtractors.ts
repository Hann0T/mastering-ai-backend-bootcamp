import pdfParse from 'pdf-parse';

export type SupportedDocumentType = 'pdf' | 'markdown' | 'text';

// TODO: improve this, expect the file and validate the mime type and extension
export function detectDocumentType(fileName: string): SupportedDocumentType {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'md':
      return 'markdown';
    case 'txt':
      return 'text';
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

export async function extractTextFromDocument(
  content: Buffer | string,
  format: SupportedDocumentType
): Promise<{ text: string, pageCount?: number }> {
  switch (format) {
    case 'text':
      return {
        text: typeof content === 'string'
          ? content : content.toString('utf-8')
      };
    case 'markdown':
      const raw = typeof content === 'string' ? content : content.toString('utf-8');
      return {
        text: stripMarkdown(raw)
      };
    case 'pdf':
      const buffer = typeof content === 'string'
        ? Buffer.from(content, 'utf-8')
        : content;
      const parsed = await pdfParse(buffer);
      return {
        text: cleanExtractedText(parsed.text),
        pageCount: parsed.numpages
      };
    default:
      throw new Error(`Unsupported document format: ${format}`);
  }
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\((.*?)\)/g, '$1') // Remove links but keep text
    .replace(/[#>*_~`-]+/g, '') // Remove markdown characters
    .replace(/\n{2,}/g, '\n') // Replace multiple newlines with a single newline
    .trim();
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')       // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')   // Collapse excessive newlines
    .replace(/\s{3,}/g, ' ')       // Collapse excessive spaces
    .trim();
}
