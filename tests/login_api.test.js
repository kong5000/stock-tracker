const mongoose = require('mongoose')
const User = require('../models/user')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)

const initialUser = {
    username: 'testuser',
    password: 'testpassword'
}

beforeEach(async () => {
    await User.deleteMany({})

    await api
        .post('/api/users')
        .send(initialUser)
        .expect(200)
        .expect('Content-Type', /application\/json/)
})

test('Login succesful with valid credentials', async () => {
    await api
        .post('/api/login')
        .send(initialUser)
        .expect(200)
})

test('Login unsuccessful with invalid credentials0', async () => {
    const invalidUsernameUser = {
        username: 'not_the_test_user',
        password: initialUser.password
    }

    await api
    .post('/api/login')
    .send(invalidUsernameUser)
    .expect(401)

    const invalidPasswordUser = {
        username: 'initialUser.username',
        password: 'the_wrong_password'
    }
    await api
    .post('/api/login')
    .send(invalidPasswordUser)
    .expect(401)
})