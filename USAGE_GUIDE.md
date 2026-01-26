# Usage Guide - New Patterns & Hooks

Quick reference for using the new architecture patterns introduced in the code improvements.

## 🪝 Custom Hooks

### useProducts()
Manages product data and operations.

```tsx
import { useProducts } from '../hooks/useProducts';

function MyComponent() {
  const {
    products,           // Product[]
    loading,           // boolean
    error,             // string | null
    loadProducts,      // () => Promise<void>
    createNewProduct,  // (payload) => Promise<Product>
    updateExistingProduct, // (id, payload) => Promise<Product>
    deleteExistingProduct, // (id) => Promise<void>
  } = useProducts();

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {products.map(p => <div key={p.id}>{p.name}</div>)}
    </div>
  );
}
```

### useUsers()
Manages user data and operations.

```tsx
import { useUsers } from '../hooks/useUsers';

function AdminPanel() {
  const {
    users,      // User[]
    loading,    // boolean
    error,      // string | null
    loadUsers,  // () => Promise<void>
    removeUser, // (id) => Promise<void>
  } = useUsers();

  return (
    <>
      {users.map(user => (
        <div key={user.id}>
          {user.name}
          <button onClick={() => removeUser(user.id)}>Delete</button>
        </div>
      ))}
    </>
  );
}
```

### useMessage()
Manages notification state and display.

```tsx
import { useMessage } from '../hooks/useMessage';

function FormComponent() {
  const {
    message,      // Message | null
    showMessage,  // (type, text) => void
    showError,    // (error, defaultMessage) => void
    dismiss,      // () => void
  } = useMessage();

  const handleSubmit = async () => {
    try {
      await saveData();
      showMessage('success', 'Data saved!');
    } catch (error) {
      showError(error, 'Failed to save');
    }
  };

  return (
    <>
      {message && (
        <div className={`notification ${message.type}`}>
          {message.text}
          <button onClick={dismiss}>×</button>
        </div>
      )}
    </>
  );
}
```

---

## 🔐 Authentication

### useAuth()
Access global authentication state.

```tsx
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { user, isAuthenticated, signIn, signOut, error } = useAuth();

  return (
    <>
      {!isAuthenticated ? (
        <button onClick={() => signIn('user@email.com', 'password')}>
          Login
        </button>
      ) : (
        <>
          <p>Welcome, {user?.name}</p>
          <button onClick={signOut}>Logout</button>
        </>
      )}
    </>
  );
}
```

### AuthProvider
Wrap your app in AuthProvider (usually in `_app.tsx`).

```tsx
import { AuthProvider } from '../context/AuthContext';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
```

---

## 📝 Form Validation

### Validation Schemas
Use predefined schemas with react-hook-form.

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormData } from '../lib/validationSchemas';

function ProductForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
  });

  const onSubmit = async (data: ProductFormData) => {
    console.log(data); // Type-safe form data
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}

      <input {...register('price')} type="number" />
      {errors.price && <span>{errors.price.message}</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Custom Validation
Extend Zod schemas for custom validation.

```tsx
import { z } from 'zod';

const customSchema = z.object({
  email: z.string().email(),
  confirmEmail: z.string().email(),
}).refine(data => data.email === data.confirmEmail, {
  message: "Emails don't match",
  path: ["confirmEmail"],
});
```

---

## 🌐 SEO & Metadata

### Seo Component
Add SEO meta tags to any page.

```tsx
import { Seo } from '../components/Seo';
import { getProductMetadata } from '../lib/seoMetadata';

function ProductPage({ product }) {
  return (
    <>
      <Seo 
        metadata={getProductMetadata(product)}
        structuredData={product}
        structuredDataType="Product"
      />
      <h1>{product.name}</h1>
    </>
  );
}
```

### Custom Metadata
Create custom metadata for pages.

```tsx
import { Seo } from '../components/Seo';

function ArticlePage() {
  return (
    <>
      <Seo
        metadata={{
          title: 'Article Title',
          description: 'Article description',
          ogImage: 'https://example.com/image.jpg',
          canonical: 'https://example.com/article',
        }}
      />
      <article>...</article>
    </>
  );
}
```

---

## 🖼️ Image Optimization

### Using Next.js Image
Replace `<img>` with `<Image>` for optimization.

```tsx
import Image from 'next/image';

// ✅ Good - Optimized
<Image
  src="/my-image.jpg"
  alt="Description"
  width={640}
  height={480}
  priority={false}
/>

// ❌ Bad - Not optimized
<img src="/my-image.jpg" alt="Description" />
```

---

## ⚙️ Configuration

### Access Config
Use centralized configuration.

```tsx
import { config } from '../lib/config';

// API endpoint
console.log(config.apiBaseUrl); // 'http://localhost:8080/api'

// Demo mode
if (config.isDemoMode) {
  useData(fallbackData);
}

// Environment
console.log(config.environment); // 'development' | 'production'

// Features
if (config.features.enableAnalytics) {
  trackEvent('page_view');
}
```

---

## 🚨 Error Handling

### getErrorMessage()
Parse any error type consistently.

```tsx
import { getErrorMessage } from '../services/apiError';

try {
  await api.call();
} catch (error) {
  const message = getErrorMessage(error);
  console.log(message); // Always a string
}
```

### Error Message Examples
- `Error` object: returns error.message
- API response object: checks message, error, details fields
- String: returns as-is
- Unknown: returns fallback message

---

## 📋 Complete Example - Admin Page

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProducts } from '../hooks/useProducts';
import { useMessage } from '../hooks/useMessage';
import { productFormSchema } from '../lib/validationSchemas';

export default function AdminPage() {
  const { products, loading, createNewProduct } = useProducts();
  const { message, showMessage } = useMessage();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(productFormSchema),
  });

  const onSubmit = async (data) => {
    try {
      await createNewProduct({
        name: data.name,
        price: Number(data.price),
        stock: Number(data.stock),
        description: data.description || null,
        imageUrl: data.imageUrl || null,
      });
      showMessage('success', 'Product created!');
    } catch (error) {
      showMessage('error', 'Failed to create product');
    }
  };

  return (
    <>
      {message && (
        <div className={`notification notification-${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register('name')} />
        {errors.name && <span>{errors.name.message}</span>}
        
        <button type="submit" disabled={loading}>
          Create
        </button>
      </form>

      <ul>
        {products.map(p => <li key={p.id}>{p.name}</li>)}
      </ul>
    </>
  );
}
```

---

## 🔗 Related Files

| Pattern | File |
|---------|------|
| Custom Hooks | `hooks/*.ts` |
| Auth Context | `context/AuthContext.tsx` |
| Validation | `lib/validationSchemas.ts` |
| Config | `lib/config.ts` |
| SEO | `lib/seoMetadata.ts`, `components/Seo.tsx` |
| Error Handling | `services/apiError.ts` |
| API Fetching | `services/api.ts` |

---

## 💡 Best Practices

1. **Always use custom hooks** for data fetching in components
2. **Use react-hook-form** for any form with more than 2 fields
3. **Use Seo component** on every page for better SEO
4. **Replace img tags** with Image component
5. **Use AuthProvider** to wrap your app for auth state
6. **Check config** for environment-based behavior
7. **Use getErrorMessage()** for consistent error handling
8. **Define validation schemas** once, reuse everywhere

---

## 🆘 Troubleshooting

**Form validation not working?**
- Check that `zodResolver` is properly imported
- Verify schema field names match form field names
- Ensure `@hookform/resolvers` is installed

**AuthContext not working?**
- Wrap app with `<AuthProvider>` in `_app.tsx`
- Call `useAuth()` inside components within Provider
- Check localStorage isn't disabled

**Custom hooks returning errors?**
- Check that custom hooks are called at top level
- Verify dependencies array is correct
- Use `useEffect` to trigger data loading

---

Last updated: January 2026
