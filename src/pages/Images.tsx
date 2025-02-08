import { useState, useEffect } from 'react';
import { Title, Tabs } from '@mantine/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { Category, Template, Image } from '../types';
import ImageUploader from '../components/images/ImageUploader';
import ImageGallery from '../components/images/ImageGallery';
import CategoryView from '../components/images/CategoryView';

const client = generateClient<Schema>();

export default function Images() {
  const [activeTab, setActiveTab] = useState<string | null>('upload');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, Image[]>>({});

  useEffect(() => {
    loadCategories();
    loadTemplates();
  }, []);

  const loadCategories = async () => {
    try {
      const result = await client.models.Category.list();
      const loadedCategories = result.data.map(category => ({
        id: category.id,
        name: category.name || '',
        templateId: category.templateId || ''
      }));
      setCategories(loadedCategories);

      loadedCategories.forEach(category => {
        loadCategoryImages(category.id);
      });
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCategoryImages = async (categoryId: string) => {
    try {
      const result = await client.models.Image.list({
        filter: {
          categoryId: {
            eq: categoryId
          }
        }
      });

      setCategoryImages(prev => ({
        ...prev,
        [categoryId]: result.data.map(image => ({
          id: image.id,
          s3Key: image.s3Key || '',
          s3Url: image.s3Url || '',
          categoryId: image.categoryId || '',
          metadata: image.metadata || '{}',
          isActive: image.isActive ?? true, // Use nullish coalescing to default to true
          sequence: image.sequence ?? 0 // Use nullish coalescing to default to 0
        }))
      }));
    } catch (error) {
      console.error('Error loading category images:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await client.models.Template.list();
      setTemplates(result.data.map(template => ({
        id: template.id,
        name: template.name || '',
        fields: template.fields || '[]'
      })));
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setActiveTab('category');
  };

  const handleBackToGallery = () => {
    setSelectedCategory(null);
    setActiveTab('gallery');
  };

  const handleImageUpdate = () => {
    if (selectedCategory) {
      loadCategoryImages(selectedCategory);
    }
  };

  const renderCategoryView = () => {
    if (!selectedCategory) return null;

    const category = categories.find(c => c.id === selectedCategory);
    if (!category) return null;

    const template = templates.find(t => t.id === category.templateId);
    const images = categoryImages[selectedCategory] || [];

    return (
        <CategoryView
            category={category}
            template={template}
            images={images}
            onBack={handleBackToGallery}
            onUpdate={handleImageUpdate}
        />
    );
  };

  return (
      <div>
        <Title order={1} mb="xl">Images</Title>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="xl">
            <Tabs.Tab value="upload">Upload Images</Tabs.Tab>
            <Tabs.Tab value="gallery">Browse Images</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="upload">
            <ImageUploader
                categories={categories}
                templates={templates}
                onUploadComplete={loadCategoryImages}
            />
          </Tabs.Panel>

          <Tabs.Panel value="gallery">
            <ImageGallery
                categories={categories}
                categoryImages={categoryImages}
                onCategorySelect={handleCategorySelect}
            />
          </Tabs.Panel>

          <Tabs.Panel value="category">
            {renderCategoryView()}
          </Tabs.Panel>
        </Tabs>
      </div>
  );
}
