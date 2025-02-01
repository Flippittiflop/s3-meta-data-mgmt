import { useState } from 'react';
import { Container, Title, Button, Card, Select, Stack, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { Image } from '../types';

const client = generateClient<Schema>();

export default function Images() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [images, setImages] = useState<Image[]>([]);

  const handleDrop = async (files: File[]) => {
    // S3 upload implementation will go here
    console.log('Dropped files:', files);
  };

  return (
    <Container>
      <Title order={1} mb="xl">Images</Title>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl">
        <Stack>
          <Select
            label="Category"
            placeholder="Select a category"
            data={[]} // Will be populated with categories
            value={selectedCategory}
            onChange={setSelectedCategory}
            required
          />
          
          <Dropzone
            onDrop={handleDrop}
            accept={['image/*']}
            maxSize={5 * 1024 ** 2} // 5MB
          >
            <Stack align="center" spacing="xs" style={{ minHeight: 120, justifyContent: 'center' }}>
              <Dropzone.Accept>
                <IconUpload size={32} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={32} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto size={32} />
              </Dropzone.Idle>
              <Text size="sm" inline>
                Drag images here or click to select files
              </Text>
            </Stack>
          </Dropzone>
        </Stack>
      </Card>

      {/* Image grid will be implemented here */}
    </Container>
  );
}