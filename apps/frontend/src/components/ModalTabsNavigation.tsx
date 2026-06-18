import { Box, Tab, Tabs } from "@mui/material";

export interface ModalTabOption {
  value: number;
  label: string;
}

interface ModalTabsNavigationProps {
  value: number;
  options: ModalTabOption[];
  onChange: (value: number) => void;
}

export default function ModalTabsNavigation({
  value,
  options,
  onChange,
}: ModalTabsNavigationProps) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", flex: "0 0 auto" }}>
      <Tabs
        value={value}
        onChange={(_event, newValue) => onChange(newValue)}
        sx={{ minHeight: "unset", maxHeight: "unset", height: "30px" }}
      >
        {options.map((option) => (
          <Tab
            key={option.value}
            value={option.value}
            label={option.label}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              px: 1,
              py: 0,
              minWidth: "unset",
              maxWidth: "unset",
              minHeight: "unset",
              maxHeight: "unset",
              height: "30px",
              textTransform: "capitalize",
              ...(value === option.value
                ? {
                    border: "1px solid",
                    borderColor: "divider",
                    borderBottom: "none",
                    borderRadius: "4px 4px 0 0",
                  }
                : {}),
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
