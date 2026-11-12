import { Box, Tab, Tabs } from "@mui/material";
import { modalTabsNavigationStyles } from "./ModalTabsNavigation.styles";
import type { ModalTabsNavigationProps } from "./ModalTabsNavigation.types";

export default function ModalTabsNavigation({
  value,
  options,
  onChange,
}: ModalTabsNavigationProps) {
  return (
    <Box sx={modalTabsNavigationStyles.container}>
      <Tabs
        value={value}
        onChange={(_event, newValue) => onChange(newValue)}
        sx={modalTabsNavigationStyles.tabs}
      >
        {options.map((option) => (
          <Tab
            key={option.value}
            value={option.value}
            label={option.label}
            sx={modalTabsNavigationStyles.tab(value === option.value)}
          />
        ))}
      </Tabs>
    </Box>
  );
}
