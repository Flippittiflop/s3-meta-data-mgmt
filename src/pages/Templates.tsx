import { useState } from 'react';
import { Container, Title, Button, Card, TextInput, Stack, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { generateClient } from 'aws-amplify/data';
import { notifications } from '@mantine/notifications';
import type { Schema } from '../../amplify/data/resource';
import type { Template, TemplateField } from '../types';

const client = generateClient<Schema>();

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);

  const form = useForm({
    initialValues: {
      name: '',
      fields: [] as TemplateField[],
    },
    validate: {
      name: (value) => (!value ? 'Template name is required' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const result = await client.models.Template.create({
        name: values.name,
        fields: JSON.stringify(values.fields || []),
      });
      
      notifications.show({
        title: 'Success',
        message: 'Template created successfully',
        color: 'green',
      });
      
      form.reset();
      // Refresh templates list
      setTemplates(prev => [...prev, result.data]);
    } catch (error) {
      console.error('Error creating template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create template. Please try again.',
        color: 'red',
      });
    }
  };

  return (
    <Container>
      <Title order={1} mb="xl">Templates</Title>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Template Name"
              placeholder="Enter template name"
              required
              {...form.getInputProps('name')}
            />
            <Group justify="flex-end">
              <Button type="submit">Create Template</Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {/* Template list will be implemented here */}
    </Container>
  );
}