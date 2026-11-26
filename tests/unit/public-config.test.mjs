import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePublicSupabaseConfig } from '../../src/lib/publicSupabaseConfig.ts'

const project = 'https://project.supabase.co/'
const jwt = (role) => 'header.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature'

test('accepts public Supabase keys', () => {
  for (const key of ['sb_publishable_fixture', jwt('anon')]) {
    assert.deepEqual(validatePublicSupabaseConfig(project, key), { url: project, key })
  }
})

test('rejects private and malformed keys without printing them', () => {
  for (const key of ['sb_secret_fixture', jwt('service_role'), 'bad.key.value', 'fixture-key']) {
    assert.throws(() => validatePublicSupabaseConfig(project, key), (error) =>
      /publishable key/.test(error.message) && !error.message.includes(key))
  }
})

test('only permits HTTP and fixture key on the loopback interface', () => {
  assert.equal(validatePublicSupabaseConfig('http://127.0.0.1:54321', 'fixture-key').key, 'fixture-key')
  for (const url of ['', 'http://project.supabase.co', 'https://user:secret@project.supabase.co', project + '?token=secret']) {
    assert.throws(() => validatePublicSupabaseConfig(url, 'sb_publishable_fixture'))
  }
})
