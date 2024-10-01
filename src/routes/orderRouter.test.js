const request = require('supertest');
const app = require('../service');
const createAdminUser = require("./franchiseRouter.test");

let testUser;
let testUserAuthToken;
const testOrderItem = { title: randomName(), description: randomName(), image:'pizza9.png', price: 1.0 };

beforeAll(async () => {
    testUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(testUser);
    testUserAuthToken = loginRes.body.token;
});

test('get order menu', async () => {
    const res = await request(app).get('/api/order/menu').send();
    expect(res.status).toBe(200);
});

test('add order item', async () => {
    const res = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${testUserAuthToken}`).send(testOrderItem);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining(testOrderItem)]));
});

test('get orders for user', async () => {
    const res = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`).send();
    expect(res.status).toBe(200);
});

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

