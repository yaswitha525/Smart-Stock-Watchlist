import request from 'supertest';
import { app } from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';

async function main() {
  process.env.JWT_SECRET = 'test_jwt_secret_key_groww_code_2026';

  const userA = await AuthService.register({
    email: `debug_user_${Date.now()}@example.com`,
    password: 'password123',
  });

  const createRes = await request(app)
    .post('/api/v1/watchlists')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({
      name: 'Test Watchlist',
      description: 'Test Description',
    });

  console.log('CREATE STATUS:', createRes.status);
  console.log('CREATE BODY:', JSON.stringify(createRes.body, null, 2));

  const watchlistId = createRes.body.data.id;

  const putRes = await request(app)
    .put(`/api/v1/watchlists/${watchlistId}`)
    .set('Authorization', `Bearer ${userA.token}`)
    .send({
      name: 'Updated Name',
      description: 'Updated Description',
    });

  console.log('PUT STATUS:', putRes.status);
  console.log('PUT BODY:', JSON.stringify(putRes.body, null, 2));
}

main().catch(console.error);
