# Frontend Reference

This Next.js UI consumes the Spring Boot API running at http://localhost:8080.

## API Endpoints

Auth
- POST http://localhost:8080/api/auth/register
- POST http://localhost:8080/api/auth/login

Products
- GET http://localhost:8080/api/products
- GET http://localhost:8080/api/products/{id}
- POST http://localhost:8080/api/products
- PUT http://localhost:8080/api/products/{id}
- DELETE http://localhost:8080/api/products/{id}

Orders
- POST http://localhost:8080/api/orders
- GET http://localhost:8080/api/orders
- GET http://localhost:8080/api/orders/all

## Entity Fields

User (see User.java:24-53)
- id: number
- username: string
- email: string
- password: string (never expose in API responses)
- role: USER | ADMIN
- orders: Order[] (lazy-loaded, usually omitted)

Product (see Product.java:22-49)
- id: number
- name: string
- description: string | null
- price: number
- stock: number
- imageUrl: string | null

OrderItem (see OrderItem.java:26-56)
- id: number
- order: Order (avoid serializing to prevent recursion)
- product: Product
- quantity: number
- price: number

Order (see Order.java:30-70)
- id: number
- user: User (often replaced with userId from userId())
- total: number
- createdAt: string (ISO timestamp)
- items: OrderItem[]

## DTO Payloads

LoginRequest (LoginRequest.java:5-15)
```
{ "username": string, "password": string }
```

RegisterRequest (RegisterRequest.java:5-19)
```
{ "username": string, "email": string, "password": string }
```

LoginResponse (LoginResponse.java:5-10)
```
{ "token": string, "expiresAt": string, "tokenType": "Bearer" }
```

OrderRequest (OrderRequest.java:7-25)
```
{ "items": [{ "productId": number, "quantity": number }] }
```

Frontend consumers should treat numeric identifiers as numbers, timestamps as ISO strings, and respect nullable properties like description and imageUrl.
