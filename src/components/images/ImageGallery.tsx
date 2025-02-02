import { SimpleGrid, Card, Group, Text } from '@mantine/core';
import { IconCategory } from '@tabler/icons-react';
import type { Category } from '../../types';

interface ImageGalleryProps {
    categories: Category[];
    categoryImages: Record<string, any[]>;
    onCategorySelect: (categoryId: string) => void;
}

export default function ImageGallery({ categories, categoryImages, onCategorySelect }: ImageGalleryProps) {
    return (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {categories.map(category => (
                <Card
                    key={category.id}
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => onCategorySelect(category.id)}
                >
                    <Group justify="center" mb="md">
                        <IconCategory size={32} />
                    </Group>
                    <Text ta="center" fw={500} size="lg">{category.name}</Text>
                    <Text ta="center" c="dimmed" size="sm">
                        {categoryImages[category.id]?.length || 0} images
                    </Text>
                </Card>
            ))}
        </SimpleGrid>
    );
}
