import { Box, Button, IconButton, Tooltip } from '@mui/material';
import {
  Save as SaveIcon,
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';

interface ModalToolbarProps {
  isDisabled: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  onSaveAndClose: () => void;
  onSaveAndNew: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  canNavigateUp?: boolean;
  canNavigateDown?: boolean;
  isSaving?: boolean;
  isEditing?: boolean;
}

export default function ModalToolbar({
  isDisabled,
  onEditToggle,
  onSave,
  onSaveAndClose,
  onSaveAndNew,
  onNavigateUp,
  onNavigateDown,
  canNavigateUp = false,
  canNavigateDown = false,
  isSaving = false,
  isEditing = false,
}: ModalToolbarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        gap: 2,
      }}
    >
      {/* Save Actions */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="Guardar">
          <span>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={onSave}
              disabled={isDisabled || isSaving}
              startIcon={<SaveIcon />}
            >
              Guardar
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Guardar y cerrar">
          <span>
            <Button
              size="small"
              variant="outlined"
              onClick={onSaveAndClose}
              disabled={isDisabled || isSaving}
            >
              Guardar y Cerrar
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Guardar y nuevo">
          <span>
            <Button
              size="small"
              variant="outlined"
              onClick={onSaveAndNew}
              disabled={isDisabled || isSaving}
            >
              Guardar y Nuevo
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Edit Toggle and Navigation */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Edit Icon - only show when not creating new */}
        {isEditing && (
          <Tooltip title={isDisabled ? 'Editar' : 'Cancelar edición'}>
            <IconButton
              size="small"
              onClick={onEditToggle}
              color={isDisabled ? 'default' : 'primary'}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Navigation Arrows */}
        <Tooltip title="Anterior">
          <span>
            <IconButton
              size="small"
              onClick={onNavigateUp}
              disabled={!canNavigateUp}
            >
              <ArrowUpIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Siguiente">
          <span>
            <IconButton
              size="small"
              onClick={onNavigateDown}
              disabled={!canNavigateDown}
            >
              <ArrowDownIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
