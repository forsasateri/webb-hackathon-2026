# Development Guidelines

## Project Structure

### `/src/pages`
Contains complete pages - top level rendering objects with their own URL paths.

**Rules:**
- Keep pages very short and simple
- Move almost all UI design to components, even if it means unique one-off components
- Only keep multiple components in a page if elements are truly unrelated
- Pages handle data fetching and pass data down to components

### `/src/components`
Contains all components for building the UI.

**Rules:**
- Can be organized in subfolders as needed for easier management
- Extract visual logic from pages to keep them clean
- Make components focused and reusable where possible

### `/src/api`
Manages all communication with backend as simple functions.

**Rules:**
- Used by pages (or components if needed)
- Each function should handle one specific API call
- Currently returns mock data - update when backend is ready

### `/src/types`
Contains TypeScript type definitions for data.

**Rules:**
- Types represent the contract for the shape of the frontend/backend API
- Primarily for data received from backend
- Keep types accurate and up to date

### `/src/shared`
Contains shared code such as utility functions or other non-visual code.

**Rules:**
- Offload functions that would otherwise clutter components
- Pure functions, constants, and helper utilities
- No UI-related code
