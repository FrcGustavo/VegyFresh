# Component Creation Rules

This document outlines the standard structure and conventions for creating reusable components in this frontend application.

## Directory Structure

All reusable components should be created in `src/components/` with the following folder structure:

```
src/components/
├── YourComponent/
│   ├── YourComponent.tsx       # Main component file
│   ├── YourComponent.types.ts  # Type definitions and interfaces
│   ├── YourComponent.styles.ts # Styled-components or sx prop styles
│   ├── YourComponent.hooks.ts  # Custom hooks for this component
│   └── index.ts                # Barrel export
```

## File Descriptions

### 1. `YourComponent.tsx` - Main Component File
The main React component implementation.

**Responsibilities:**
- Component logic and JSX structure
- Import from associated files
- Handle component rendering

**Example:**
```tsx
import { Box } from "@mui/material";
import { useYourCustomHook } from "./YourComponent.hooks";
import { componentStyles } from "./YourComponent.styles";
import type { YourComponentProps } from "./YourComponent.types";

export function YourComponent({ prop1, prop2 }: YourComponentProps) {
  const { state, handler } = useYourCustomHook();

  return (
    <Box sx={componentStyles.container}>
      {/* Component JSX */}
    </Box>
  );
}
```

### 2. `YourComponent.types.ts` - Type Definitions
All TypeScript interfaces, types, and prop definitions.

**Responsibilities:**
- Define component props interface
- Export all types needed by the component and consumers
- Document complex types

**Example:**
```tsx
export interface YourComponentProps {
  title: string;
  onAction: (value: string) => void;
  isLoading?: boolean;
}

export interface InternalState {
  status: "idle" | "loading" | "error";
}
```

### 3. `YourComponent.styles.ts` - Styling
MUI `sx` prop styles or styled-component definitions.

**Responsibilities:**
- Centralize all styling logic
- Export style objects for reuse
- Keep styles DRY and maintainable

**Example:**
```tsx
export const componentStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    p: 2,
  },
  header: {
    fontSize: "1.5rem",
    fontWeight: 600,
  },
  content: {
    flex: 1,
  },
};
```

### 4. `YourComponent.hooks.ts` - Custom Hooks
All custom hooks used by this component.

**Responsibilities:**
- Encapsulate component logic
- Manage component-specific state
- Handle side effects

**Example:**
```tsx
import { useState, useCallback } from "react";

export const useYourCustomHook = () => {
  const [state, setState] = useState("initial");

  const handler = useCallback(() => {
    setState("updated");
  }, []);

  return { state, handler };
};
```

### 5. `index.ts` - Barrel Export
Single entry point for consuming the component.

**Responsibilities:**
- Export the main component
- Export public types and utilities
- Hide internal implementation

**Example:**
```tsx
export { YourComponent } from "./YourComponent";
export { useYourCustomHook } from "./YourComponent.hooks";
export { componentStyles } from "./YourComponent.styles";
export type { YourComponentProps, InternalState } from "./YourComponent.types";
```

## Usage Example

### Creating a New Component
1. Create folder: `src/components/MyTable/`
2. Create the five files listed above
3. Implement the component following the patterns
4. Export from `index.ts`

### Consuming a Component
```tsx
import { MyTable, type MyTableProps } from "@/components/MyTable";

export function MyPage() {
  return (
    <MyTable
      columns={columns}
      data={data}
      onSort={handleSort}
    />
  );
}
```

## Best Practices

1. **Keep Components Focused**: Each component should do one thing well
2. **Type Everything**: Use TypeScript for all props and internal state
3. **Separate Concerns**: Keep styles, types, hooks, and logic in separate files
4. **Reuse Utilities**: Extract common logic into hooks
5. **Document Props**: Use JSDoc comments for complex props
6. **Export Everything**: Always export through `index.ts`

## Example: Table Component

The `Table` component demonstrates this pattern:

```
src/components/Table/
├── Table.tsx          # Main table component
├── Table.types.ts     # TableProps, ColumnConfig, SortOrder
├── Table.styles.ts    # tableStyles object
├── Table.hooks.ts     # useTableResizableColumns, useTableSelection
└── index.ts           # Barrel export
```

### Features
- **Customizable columns** with resizable headers
- **Sortable columns** with click handlers
- **Row selection** with single and double-click
- **Resizable columns** persisted to localStorage
- **Generic data handling** with TypeScript generics

### Usage
```tsx
import { Table, type ColumnConfig } from "@/components/Table";

const columns: ColumnConfig[] = [
  { key: "name", label: "Name", minWidth: 100, defaultWidth: 150 },
  { key: "email", label: "Email", minWidth: 150, defaultWidth: 250, sortable: true },
];

export function MyList() {
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  return (
    <Table
      columns={columns}
      data={items}
      keyExtractor={(item) => item.id}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={(columnKey) => handleSort(columnKey)}
      renderCell={(column, item) => item[column.key]}
      onRowDoubleClick={(rowId, item) => openEditModal(item)}
    />
  );
}
```

## Component Standards Checklist

- [ ] Component file created
- [ ] Types file with all interfaces/props
- [ ] Styles file with sx objects
- [ ] Hooks file with custom logic
- [ ] Index file with barrel exports
- [ ] Props are documented with JSDoc
- [ ] Component is TypeScript strict mode compatible
- [ ] Component is generic where appropriate (e.g., Table<T>)
- [ ] All exports are public and intentional
