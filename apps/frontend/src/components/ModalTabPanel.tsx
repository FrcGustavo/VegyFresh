import { Box } from "@mui/material";
import type { ReactNode } from "react";

interface ModalTabPanelProps {
  value: number;
  index: number;
  children: ReactNode;
}

export default function ModalTabPanel({
  value,
  index,
  children,
}: ModalTabPanelProps) {
  return (
    <div hidden={value !== index} style={{ width: "100%", height: "100%" }}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}
