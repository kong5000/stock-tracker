// const mongoose = require('mongoose')
// const User = require('../models/user')
// const supertest = require('supertest')
// const app = require('../app')
// const api = supertest(app)

// const initialUser = {
//     username: 'testuser',
//     password: 'testpassword'
// }

// beforeEach(async () => {
//     await User.deleteMany({})

//     await api
//         .post('/api/users')
//         .send(initialUser)
//         .expect(200)
//         .expect('Content-Type', /application\/json/)
// })

// test('Can create new user', async () => {
//     const initialUsers = await User.find({})
//     const initialUserCount = initialUsers.length

//     const newUser = {
//         username: 'new_user',
//         password: 'testpassword'
//     }

//     await api
//         .post('/api/users')
//         .send(newUser)
//         .expect(200)
//         .expect('Content-Type', /application\/json/)

//     const currentUsers = await User.find({})

//     const currentUserCount = currentUsers.length

//     expect(currentUserCount).toBe(initialUserCount + 1)

//     const usernames = currentUsers.map(user => user.username)
//     expect(usernames).toContain('new_user')
// })

// describe('User creation validation', () => {
//     test('Can not make new user if username already exists', async () => {
//         const initialUsers = await User.find({})
//         const initialUserCount = initialUsers.length

//         const newUser = initialUser

//         await api
//             .post('/api/users')
//             .send(newUser)
//             .expect(400)
//             .expect('Content-Type', /application\/json/)


//         const currentUsers = await User.find({})
//         const currentUserCount = currentUsers.length
//         expect(currentUserCount).toBe(initialUserCount)
//     })

//     test('Can not make new user if username and or password is too short (4 chars)', async () => {
//         const initialUsers = await User.find({})
//         const initialUserCount = initialUsers.length

//         const newUserArray = [
//             {
//                 username: '',
//                 password: ''
//             },
//             {
//                 username: 'abcdefghijk',
//                 password: '123'
//             },
//             {
//                 username: 'abc',
//                 password: '12345678910'
//             }
//         ]

//         for(i = 0; i < newUserArray.length; i++){
//             await api
//             .post('/api/users')
//             .send(newUserArray[i])
//             .expect(400)
//             .expect('Content-Type', /application\/json/)
//         }

//         const currentUsers = await User.find({})
//         const currentUserCount = currentUsers.length

//         expect(currentUserCount).toBe(initialUserCount)

//     })

// })

// afterAll(() => {
//     mongoose.connection.close()
// })