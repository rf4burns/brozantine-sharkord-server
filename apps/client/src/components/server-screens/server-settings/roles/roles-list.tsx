import { getTRPCClient } from '@/lib/trpc';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { OWNER_ROLE_ID, type TJoinedRole } from '@kurier/shared';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kurier/ui';
import { GripVertical, Plus } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TSortableRoleProps = {
  role: TJoinedRole;
  selected: boolean;
  onSelect: (roleId: number) => void;
};

const SortableRole = memo(
  ({ role, selected, onSelect }: TSortableRoleProps) => {
    const pinned = role.id === OWNER_ROLE_ID || role.isDefault;
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id: role.id, disabled: pinned });

    const handleSelect = useCallback(() => {
      onSelect(role.id);
    }, [onSelect, role.id]);

    return (
      <button
        ref={setNodeRef}
        type="button"
        onClick={handleSelect}
        style={{
          transform: CSS.Transform.toString(
            transform && { ...transform, x: 0 }
          ),
          transition
        }}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
          selected ? 'bg-accent' : ''
        } ${isDragging ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!pinned && (
            <span
              className="cursor-grab touch-none text-muted-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          )}
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: role.color }}
          />
          <span className="truncate">{role.name}</span>
        </div>
      </button>
    );
  }
);

type TRolesListProps = {
  roles: TJoinedRole[];
  selectedRoleId: number | undefined;
  setSelectedRoleId: (roleId: number) => void;
  refetch: () => void;
};

const RolesList = memo(
  ({ roles, selectedRoleId, setSelectedRoleId, refetch }: TRolesListProps) => {
    const { t } = useTranslation('settings');
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );
    const roleIds = roles.map((role) => role.id);

    const onAddRole = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const newRoleId = await trpc.roles.add.mutate();

        await refetch();

        setSelectedRoleId(newRoleId);
        toast.success(t('roleCreated'));
      } catch {
        toast.error(t('roleCreateFailed'));
      }
    }, [refetch, setSelectedRoleId, t]);

    const handleDragEnd = useCallback(
      async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
          return;
        }

        const oldIndex = roleIds.indexOf(active.id as number);
        const newIndex = roleIds.indexOf(over.id as number);

        if (oldIndex === -1 || newIndex === -1) {
          return;
        }

        const reorderedIds = [...roleIds];
        const [movedId] = reorderedIds.splice(oldIndex, 1);

        reorderedIds.splice(newIndex, 0, movedId);

        const trpc = getTRPCClient();

        try {
          await trpc.roles.reorder.mutate({ roleIds: reorderedIds });
          await refetch();
        } catch {
          toast.error(t('roleReorderFailed'));
        }
      },
      [roleIds, refetch, t]
    );

    return (
      <Card className="w-64 flex-shrink-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('rolesTitle')}</CardTitle>
            <Button size="icon" variant="ghost" onClick={onAddRole}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={roleIds}
              strategy={verticalListSortingStrategy}
            >
              {roles.map((role) => (
                <SortableRole
                  key={role.id}
                  role={role}
                  selected={selectedRoleId === role.id}
                  onSelect={setSelectedRoleId}
                />
              ))}
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    );
  }
);

export { RolesList };
