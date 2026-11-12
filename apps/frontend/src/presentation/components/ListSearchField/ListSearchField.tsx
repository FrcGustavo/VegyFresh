import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment, TextField } from "@mui/material";
import { listSearchFieldStyles } from "./ListSearchField.styles";
import type { ListSearchFieldProps } from "./ListSearchField.types";

export default function ListSearchField({
  placeholder,
  value,
  onChange,
  minWidth = 280,
}: ListSearchFieldProps) {
  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
      sx={listSearchFieldStyles.field(minWidth)}
    />
  );
}
