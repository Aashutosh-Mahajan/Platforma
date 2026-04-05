# AddressManager Component

## Overview
The AddressManager component provides a complete UI for managing user delivery addresses. It's integrated into the ProfilePage and allows users to create, edit, delete, and set default addresses.

## Features
- Display list of all user addresses
- Add new addresses with form validation
- Edit existing addresses
- Delete addresses with confirmation
- Set an address as default
- Responsive design with Tailwind CSS
- Consistent styling with auth pages

## Usage

```tsx
import AddressManager from '../components/AddressManager';

function ProfilePage() {
  return (
    <div>
      <AddressManager />
    </div>
  );
}
```

## API Integration
The component uses the `addressAPI` from `src/api/addresses.ts`:
- `list()` - Fetch all user addresses
- `create(data)` - Create a new address
- `update(id, data)` - Update an existing address
- `delete(id)` - Delete an address
- `setDefault(id)` - Set an address as default

## Form Fields
- **Label**: Dropdown (home, work, other)
- **Street Address**: Text input (required)
- **City**: Text input (required)
- **State**: Text input (required)
- **Postal Code**: Text input (required)

## Validation
- All fields except label are required
- Inline error messages display for invalid fields
- Form validation runs on submit

## Styling
- Uses Tailwind CSS classes
- Orange theme (orange-600, orange-700) for primary actions
- Consistent with LoginPage and RegisterPage styling
- Responsive grid layout for address cards

## States
- Loading state with spinner
- Empty state message
- Form show/hide toggle
- Edit mode for existing addresses
- Error handling with user-friendly messages

## Requirements Satisfied
This component satisfies the following requirements from the spec:
- 2.1: Address management interface
- 2.2: Add new addresses
- 2.3: Validate and store addresses
- 2.4: Display saved addresses
- 2.5: Edit existing addresses
- 2.6: Delete addresses
- 2.7: Set address as default
- 2.8: Unset other default addresses
- 2.9: Display addresses for selection during checkout
