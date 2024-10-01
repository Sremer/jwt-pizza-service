const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let testUser;
let testUserAuthToken;
let testUserId;
let testFranchiseId;

beforeAll(async () => {
    testUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(testUser);
    testUserAuthToken = loginRes.body.token;
    testUserId = loginRes.body.user.id;
    
    testFranchiseId = await createFranchise();
});

test('get franchises', async () => {
    const getFranRes = await request(app).get('/api/franchise').send();
    expect(getFranRes.status).toBe(200);
});

test('get user franchises', async () => {
    const getUserFanRes = await request(app).get('/api/franchise/' + testUserId).set('Authorization', `Bearer ${testUserAuthToken}`).send();
    expect(getUserFanRes.status).toBe(200);
});

test('delete franchises', async () => {
    const franchiseId = await createFranchise();
    const deleteFranRes = await request(app).delete('/api/franchise/' + franchiseId)
        .set('Authorization', `Bearer ${testUserAuthToken}`).send();
    expect(deleteFranRes.status).toBe(200);
    expect(deleteFranRes.body.message).toMatch(/franchise deleted/);
});

test('create store', async () => {
    await createStore();
});

test('delete store', async () => {
    const storeId = await createStore();
    const deleteStoreRes = await request(app).delete('/api/franchise/' + testFranchiseId + '/store/' + storeId)
        .set('Authorization', `Bearer ${testUserAuthToken}`).send();
    expect(deleteStoreRes.status).toBe(200);
    expect(deleteStoreRes.body.message).toMatch(/store deleted/);
});

const createFranchise = async () => {
    const createFranchiseRes = await request(app).post('/api/franchise')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send({ name: randomName(), admins: [{email: testUser.email}] });
    return createFranchiseRes.body.id;
};

const createStore = async () => {
    const storeName = randomName();
    const createStoreRes = await request(app).post('/api/franchise/' + testFranchiseId + '/store')
        .set('Authorization', `Bearer ${testUserAuthToken}`).send({ franchiseId: testFranchiseId, name: storeName });
    expect(createStoreRes.status).toBe(200);
    expect(createStoreRes.body.id).not.toBeNull();
    expect(createStoreRes.body.franchiseId).toBe(testFranchiseId);
    expect(createStoreRes.body.name).toMatch(storeName);
    
    return createStoreRes.body.id;
}

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

const createAdminUser = async () => {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    await DB.addUser(user);

    user.password = 'toomanysecrets';
    return user;
}


