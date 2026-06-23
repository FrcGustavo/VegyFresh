import { Box, Button, IconButton, Tooltip } from "@mui/material";
import {
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from "@mui/icons-material";
import { modalToolbarStyles } from "./ModalToolbar.styles";
import type { ModalToolbarProps } from "./ModalToolbar.types";

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
    <Box sx={modalToolbarStyles.container}>
      {/* Save Actions */}
      <Box sx={modalToolbarStyles.actionGroup}>
        <Tooltip title="Guardar">
          <span>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={onSave}
              disabled={isDisabled || isSaving}
              disableElevation
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
      <Box sx={modalToolbarStyles.navigationGroup}>
        {/* Edit Icon - only show when not creating new */}
        {isEditing && (
          <Tooltip title={isDisabled ? "Editar" : "Cancelar edición"}>
            <IconButton
              size="small"
              onClick={onEditToggle}
              color={isDisabled ? "default" : "primary"}
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
