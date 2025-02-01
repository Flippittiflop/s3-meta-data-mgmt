import { useState } from 'react';
import { Container, Title, Button, Card, TextInput, Select, Stack, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { Category } from '../types';

const client = generateClient<Schema>();

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);

  const form = useForm({
    initialValues: {
      name: '',
      templateId: '',
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await client.models.Category.create({
        name: values.name,
        templateId: values.templateId,
      });
      form.reset();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  return (
    <Container>
      <Title order={1} mb="xl">Categories</Title>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Category Name"
              placeholder="Enter category name"
              required
              {...form.getInputProps('name')}
            />
            <Select
              label="Template"
              placeholder="Select a template"
              data={[]} // Will be populated with templates
              required
              {...form.getInputProps('templateId')}
            />
            <Group justify="flex-end">
              <Button type="submit">Create Category</Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {/* Category list will be implemented here */}
    </Container>
  );
}