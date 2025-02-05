import { Modal, Text, Group, Button } from '@mantine/core';

interface ConfirmDialogProps {
    opened: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: string;
}

export default function ConfirmDialog({
                                          opened,
                                          onClose,
                                          onConfirm,
                                          title,
                                          message,
                                          confirmLabel = 'Confirm',
                                          cancelLabel = 'Cancel',
                                          confirmColor = 'red'
                                      }: ConfirmDialogProps) {
    return (
        <Modal opened={opened} onClose={onClose} title={title} centered>
            <Text size="sm" mb="lg">{message}</Text>
            <Group justify="flex-end">
                <Button variant="light" onClick={onClose}>
                    {cancelLabel}
                </Button>
                <Button color={confirmColor} onClick={onConfirm}>
                    {confirmLabel}
                </Button>
            </Group>
        </Modal>
    );
}
