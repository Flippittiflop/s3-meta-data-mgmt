export interface Template {
  id: string;
  name: string;
  fields: string; // Changed from Record<string, any> to string since we store it as JSON
}

export interface Category {
  id: string;
  name: string;
  templateId: string;
}

export interface Image {
  id: string;
  s3Key: string;
  s3Url: string;
  categoryId: string;
  metadata: string; // Changed to string since we store it as JSON
}

export interface TemplateField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'group';
  options?: string[];
  fields?: TemplateField[];
}