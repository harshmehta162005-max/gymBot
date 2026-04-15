Prevents auth bugs — correct token shape, expiry, and refresh logic for owner login.
JWT payload: { ownerId, gymName, email, iat, exp }
Token expiry: 7 days (dashboard use case, not high-security API)
Sign with HS256 using JWT_SECRET from .env — never hardcode
Backend: verify token in middleware, attach req.owner = decoded payload
Frontend: store token in localStorage under key 'gw_token'
On 401 response: clear localStorage, redirect to /login
Never store password in JWT payload — only ownerId
Password hashing: bcrypt with saltRounds = 12