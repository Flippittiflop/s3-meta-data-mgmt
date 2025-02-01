export interface Template {
  id: string;
  name: string;
  fields: Record<string, any>;
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
  metadata: Record<string, any>;
}

export interface TemplateField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  fields?: TemplateField[];
}