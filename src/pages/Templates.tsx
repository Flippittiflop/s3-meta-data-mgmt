import { useState, useEffect } from 'react';
import { Container, Title, Button, Card, TextInput, Stack, Group, Select, ActionIcon } from '@mantine/core';
import { useForm } from '@mantine/form';
import { generateClient } from 'aws-amplify/data';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { Schema } from '../../amplify/data/resource';
import type { Template, TemplateField } from '../types';

const client = generateClient<Schema>();

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'group', label: 'Group' }
] as const;

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const result = await client.models.Template.list();
      if (!result.data) return;
      
      setTemplates(result.data.map(template => ({
        id: template.id,
        name: template.name || '',
        fields: template.fields || '[]'
      })));
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const form = useForm({
    initialValues: {
      name: '',
      fields: [] as TemplateField[],
    },
    validate: {
      name: (value) => (!value ? 'Template name is required' : null),
    },
  });

  const addField = (path: string = 'fields') => {
    form.insertListItem(path, {
      name: '',
      type: 'text',
      options: [],
      fields: [],
    });
  };

  const removeField = (path: string, index: number) => {
    form.removeListItem(path, index);
  };

  const renderFields = (fields: TemplateField[], path: string = 'fields') => {
    return fields.map((field, index) => (
      <Card key={index} withBorder p="sm" mb="sm">
        <Group align="flex-start">
          <TextInput
            label="Field Name"
            placeholder="Enter field name"
            required
            style={{ flex: 1 }}
            {...form.getInputProps(`${path}.${index}.name`)}
          />
          <Select
            label="Field Type"
            data={FIELD_TYPES}
            required
            style={{ width: 120 }}
            {...form.getInputProps(`${path}.${index}.type`)}
          />
          <ActionIcon
            color="red"
            variant="subtle"
            onClick={() => removeField(path, index)}
            mt={28}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        {field.type === 'select' && (
          <TextInput
            label="Options (comma-separated)"
            placeholder="Option1, Option2, Option3"
            mt="sm"
            onChange={(event) => {
              const options = event.currentTarget.value.split(',').map(opt => opt.trim());
              form.setFieldValue(`${path}.${index}.options`, options);
            }}
          />
        )}

        {field.type === 'group' && (
          <Stack mt="sm">
            <Button
              leftSection={<IconPlus size={14} />}
              variant="light"
              size="xs"
              onClick={() => addField(`${path}.${index}.fields`)}
            >
              Add Nested Field
            </Button>
            {renderFields(field.fields || [], `${path}.${index}.fields`)}
          </Stack>
        )}
      </Card>
    ));
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const result = await client.models.Template.create({
        name: values.name,
        fields: JSON.stringify(values.fields || []),
      });

      if (!result.data) {
        throw new Error('Failed to create template');
      }
      
      const newTemplate: Template = {
        id: result.data.id,
        name: result.data.name || '',
        fields: result.data.fields || '[]'
      };
      
      notifications.show({
        title: 'Success',
        message: 'Template created successfully',
        color: 'green',
      });
      
      form.reset();
      setTemplates(prev => [...prev, newTemplate]);
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
            
            <Button
              leftSection={<IconPlus size={14} />}
              variant="light"
              onClick={() => addField()}
            >
              Add Field
            </Button>

            {renderFields(form.values.fields)}

            <Group justify="flex-end">
              <Button type="submit">Create Template</Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {templates.length > 0 && (
        <Stack mt="xl">
          <Title order={2}>Existing Templates</Title>
          {templates.map(template => (
            <Card key={template.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3}>{template.name}</Title>
              <div>Fields: {JSON.parse(template.fields).length}</div>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}