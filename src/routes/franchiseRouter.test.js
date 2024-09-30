const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let testUser;
let testUserAuthToken;
let testFranchise = { name: 'test franchise', admins: [] };
let testFranchiseId;

beforeAll(async () => {
    testUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(testUser);
    testUserAuthToken = loginRes.body.token;
    
    testFranchise.admins.push({ email: testUser.email });
    const createFranchiseRes = await request(app).post('/api/franchise')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send(testFranchise);
    testFranchiseId = createFranchiseRes.body.id;
});

test('get franchises', async () => {
    const getFranRes = await request(app).get('/api/franchise').send();
    expect(getFranRes.status).toBe(200);
});

test('get user franchises', async () => {
    
});

test('create franchises', async () => {

});

test('delete franchises', async () => {

});

test('create store', async () => {

});

test('delete store', async () => {

});

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    await DB.addUser(user);

    user.password = 'toomanysecrets';
    return user;
}


