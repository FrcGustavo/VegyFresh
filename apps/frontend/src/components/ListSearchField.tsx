import SearchIcon from '@mui/icons-material/Search';
import { InputAdornment, TextField } from '@mui/material';

interface ListSearchFieldProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  minWidth?: number;
}

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
      sx={{ minWidth, margin: 0 }}
    />
  );
}
