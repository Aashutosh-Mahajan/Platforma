from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AuthenticationTests(TestCase):
    """Test authentication endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/v1/auth/register/'
        self.login_url = '/api/v1/auth/login/'
        self.logout_url = '/api/v1/auth/logout/'
        self.password_change_url = '/api/v1/auth/password/change/'
        self.profile_url = '/api/v1/users/profile/'

        self.user_data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'customer'
        }

    def test_register_user_success(self):
        """Test successful user registration."""
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['email'], self.user_data['email'])

    def test_register_user_duplicate_email(self):
        """Test registration with duplicate email fails."""
        self.client.post(self.register_url, self.user_data, format='json')
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_user_password_mismatch(self):
        """Test registration with mismatched passwords fails."""
        data = self.user_data.copy()
        data['password_confirm'] = 'DifferentPass123!'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success(self):
        """Test successful login."""
        # First register a user
        self.client.post(self.register_url, self.user_data, format='json')
        
        # Then login
        login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials fails."""
        login_data = {
            'email': 'nonexistent@example.com',
            'password': 'WrongPass123!'
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_retrieval_authenticated(self):
        """Test authenticated user can retrieve profile."""
        # Register and get tokens
        register_response = self.client.post(self.register_url, self.user_data, format='json')
        access_token = register_response.data['tokens']['access']
        
        # Get profile
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user_data['email'])

    def test_profile_retrieval_unauthenticated(self):
        """Test unauthenticated user cannot retrieve profile."""
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_update(self):
        """Test authenticated user can update profile."""
        # Register and get tokens
        register_response = self.client.post(self.register_url, self.user_data, format='json')
        access_token = register_response.data['tokens']['access']
        
        # Update profile
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        update_data = {
            'first_name': 'Updated',
            'phone': '+919876543210'
        }
        response = self.client.patch(self.profile_url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Updated')
        self.assertEqual(response.data['phone'], '+919876543210')

    def test_password_change_success(self):
        """Test successful password change."""
        # Register and get tokens
        register_response = self.client.post(self.register_url, self.user_data, format='json')
        access_token = register_response.data['tokens']['access']
        
        # Change password
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        password_data = {
            'old_password': self.user_data['password'],
            'new_password': 'NewPass123!',
            'new_password_confirm': 'NewPass123!'
        }
        response = self.client.post(self.password_change_url, password_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify new password works
        self.client.credentials()  # Clear credentials
        login_data = {
            'email': self.user_data['email'],
            'password': 'NewPass123!'
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

    def test_password_change_wrong_old_password(self):
        """Test password change with wrong old password fails."""
        # Register and get tokens
        register_response = self.client.post(self.register_url, self.user_data, format='json')
        access_token = register_response.data['tokens']['access']
        
        # Try to change password with wrong old password
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        password_data = {
            'old_password': 'WrongOldPass123!',
            'new_password': 'NewPass123!',
            'new_password_confirm': 'NewPass123!'
        }
        response = self.client.post(self.password_change_url, password_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_success(self):
        """Test successful logout."""
        # Register and get tokens
        register_response = self.client.post(self.register_url, self.user_data, format='json')
        access_token = register_response.data['tokens']['access']
        refresh_token = register_response.data['tokens']['refresh']
        
        # Logout
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_data = {'refresh': refresh_token}
        response = self.client.post(self.logout_url, logout_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AddressManagementTests(TestCase):
    """Test address management endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/v1/auth/register/'
        self.addresses_url = '/api/v1/users/addresses/'

        # Register a user and get tokens
        self.user_data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'customer'
        }
        register_response = self.client.post(self.register_url, self.user_data, format='json')
        self.access_token = register_response.data['tokens']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

        self.address_data = {
            'label': 'home',
            'street': '123 Main St',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'postal_code': '400001',
            'is_default': False
        }

    def test_create_address_success(self):
        """Test creating a new address."""
        response = self.client.post(self.addresses_url, self.address_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['street'], self.address_data['street'])
        self.assertEqual(response.data['city'], self.address_data['city'])
        self.assertEqual(response.data['label'], self.address_data['label'])

    def test_create_address_unauthenticated(self):
        """Test unauthenticated user cannot create address."""
        self.client.credentials()  # Clear credentials
        response = self.client.post(self.addresses_url, self.address_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_addresses(self):
        """Test listing user addresses."""
        # Create two addresses
        self.client.post(self.addresses_url, self.address_data, format='json')
        work_address = self.address_data.copy()
        work_address['label'] = 'work'
        work_address['street'] = '456 Office Rd'
        self.client.post(self.addresses_url, work_address, format='json')

        # List addresses
        response = self.client.get(self.addresses_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if response is paginated
        if isinstance(response.data, dict) and 'results' in response.data:
            self.assertEqual(len(response.data['results']), 2)
        else:
            self.assertEqual(len(response.data), 2)

    def test_list_addresses_only_own(self):
        """Test user can only see their own addresses."""
        # Create address for first user
        self.client.post(self.addresses_url, self.address_data, format='json')

        # Register second user
        user2_data = {
            'email': 'test2@example.com',
            'username': 'testuser2',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Test2',
            'last_name': 'User2',
            'role': 'customer'
        }
        register_response = self.client.post(self.register_url, user2_data, format='json')
        user2_token = register_response.data['tokens']['access']

        # Switch to second user
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {user2_token}')
        response = self.client.get(self.addresses_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if response is paginated
        if isinstance(response.data, dict) and 'results' in response.data:
            self.assertEqual(len(response.data['results']), 0)  # Should not see first user's addresses
        else:
            self.assertEqual(len(response.data), 0)  # Should not see first user's addresses

    def test_retrieve_address(self):
        """Test retrieving a specific address."""
        create_response = self.client.post(self.addresses_url, self.address_data, format='json')
        address_id = create_response.data['id']

        response = self.client.get(f'{self.addresses_url}{address_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], address_id)

    def test_update_address(self):
        """Test updating an address."""
        create_response = self.client.post(self.addresses_url, self.address_data, format='json')
        address_id = create_response.data['id']

        update_data = {'street': '789 New St', 'city': 'Delhi'}
        response = self.client.patch(f'{self.addresses_url}{address_id}/', update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['street'], '789 New St')
        self.assertEqual(response.data['city'], 'Delhi')

    def test_delete_address(self):
        """Test deleting an address."""
        create_response = self.client.post(self.addresses_url, self.address_data, format='json')
        address_id = create_response.data['id']

        response = self.client.delete(f'{self.addresses_url}{address_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify address is deleted
        get_response = self.client.get(f'{self.addresses_url}{address_id}/')
        self.assertEqual(get_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_set_default_address(self):
        """Test setting an address as default."""
        # Create two addresses
        response1 = self.client.post(self.addresses_url, self.address_data, format='json')
        address1_id = response1.data['id']

        address2_data = self.address_data.copy()
        address2_data['label'] = 'work'
        address2_data['street'] = '456 Office Rd'
        response2 = self.client.post(self.addresses_url, address2_data, format='json')
        address2_id = response2.data['id']

        # Set second address as default
        response = self.client.patch(f'{self.addresses_url}{address2_id}/set_default/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_default'])

        # Verify first address is no longer default
        get_response = self.client.get(f'{self.addresses_url}{address1_id}/')
        self.assertFalse(get_response.data['is_default'])

    def test_only_one_default_address(self):
        """Test that only one address can be default at a time."""
        # Create first address as default
        address1_data = self.address_data.copy()
        address1_data['is_default'] = True
        response1 = self.client.post(self.addresses_url, address1_data, format='json')
        address1_id = response1.data['id']
        self.assertTrue(response1.data['is_default'])

        # Create second address as default
        address2_data = self.address_data.copy()
        address2_data['label'] = 'work'
        address2_data['street'] = '456 Office Rd'
        address2_data['is_default'] = True
        response2 = self.client.post(self.addresses_url, address2_data, format='json')
        self.assertTrue(response2.data['is_default'])

        # Verify first address is no longer default
        get_response = self.client.get(f'{self.addresses_url}{address1_id}/')
        self.assertFalse(get_response.data['is_default'])

    def test_create_address_missing_required_fields(self):
        """Test creating address with missing required fields fails."""
        incomplete_data = {'label': 'home'}
        response = self.client.post(self.addresses_url, incomplete_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_cannot_access_other_user_address(self):
        """Test user cannot access another user's address."""
        # Create address for first user
        create_response = self.client.post(self.addresses_url, self.address_data, format='json')
        address_id = create_response.data['id']

        # Register second user
        user2_data = {
            'email': 'test2@example.com',
            'username': 'testuser2',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Test2',
            'last_name': 'User2',
            'role': 'customer'
        }
        register_response = self.client.post(self.register_url, user2_data, format='json')
        user2_token = register_response.data['tokens']['access']

        # Try to access first user's address as second user
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {user2_token}')
        response = self.client.get(f'{self.addresses_url}{address_id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
