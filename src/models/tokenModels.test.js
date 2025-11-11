const tokenModel = require('./tokenModels');

describe('token crud operations', () => {
    const createdTokenIds = [];

    afterAll(async () => {
        console.log(`\nCleaning up ${createdTokenIds.length} test tokens...`);
        for (const id of createdTokenIds) {
            try {
                await tokenModel.deleteToken(id);
            } catch(err) {
                console.log("All clean already!")
            }
        }
        console.log("Cleanup complete!")    
    });

    // getTokens Tests
    describe('getToken', () => {
        test('getTokens returns an array', async () => {
            const result = await tokenModel.getTokens();
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });

        test('each token has required fields', async () => {
            const tokens = await tokenModel.getTokens();

            if (tokens.length > 0) {
                const token = tokens[0];
                expect(token).toHaveProperty('id');
                expect(token).toHaveProperty('service');
                expect(token).toHaveProperty('token');
                expect(token).toHaveProperty('value');
                expect(token).toHaveProperty('type');
                expect(token).toHaveProperty('expiryDate');

                expect(typeof token.id).toBe('string');
            }
        });
    });

    // addToken Tests
    describe('addToken', () => {
        test('addToken creates a new token', async () => {
            const testData = {
                tokenName: 'Test Token',
                serviceName: 'GitHub',
                tokenValue: 'test_12345',
                tokenType: 'API_KEY',
                expiryDate: '2025-12-31'
            };
            const newToken = await tokenModel.addToken(testData);
            createdTokenIds.push(newToken.id);

            expect(newToken).toBeDefined();
            expect(newToken.id).toBeDefined();
            expect(typeof newToken.id).toBe('string');
            expect(newToken.tokenName).toBe(testData.tokenName);
            expect(newToken.serviceName).toBe(testData.serviceName);
            expect(newToken.tokenValue).toBe(testData.tokenValue);
            expect(newToken.tokenType).toBe(testData.tokenType);
            expect(newToken.expiryDate).toBe(testData.expiryDate);
        });

        test('creates token with minimal fields', async () => {
            const minimalData = {
                tokenName: 'Minimal Token',
                serviceName: 'Test Service',
                tokenValue: 'test_value_456',
                tokenType: 'API_KEY'
            };
            const newToken = await tokenModel.addToken(minimalData);
            createdTokenIds.push(newToken.id);

            expect(newToken.id).toBeDefined();
            expect(newToken.tokenName).toBe('Minimal Token');
        });

        test('getTokens returns created token', async () => {
            const testData = {
                tokenName: 'Findable Token',
                serviceName: 'Find Me',
                tokenValue: 'find_me_123',
                tokenType: 'OAUTH',
                expiryDate: '2026-06-15'
            };

            const newToken = await tokenModel.addToken(testData);
            createdTokenIds.push(newToken.id);

            const allTokens = await tokenModel.getTokens();

            const foundToken = allTokens.find(t => t.id == newToken.id);

            expect(foundToken).toBeDefined();
            expect(foundToken.service).toBe('Find Me');
        });
    });

// updateToken tests
describe('updateToken', () => {
    let tokenId;

    beforeEach(async() => {
        const token = await tokenModel.addToken({
                tokenName: 'Update Test Token',
                serviceName: 'Update Service',
                tokenValue: 'update_value_123',
                description: 'Original description',
                tokenType: 'API_KEY',
                expiryDate: '2025-12-31'
        });
        tokenId = token.id;
        createdTokenIds.push(tokenId);
    });

    test('updates all token fields', async () => {
            const updates = {
                tokenName: 'Updated Token Name',
                serviceName: 'Updated Service',
                tokenValue: 'new_value_456',
                description: 'Updated description',
                tokenType: 'OAUTH',
                expiryDate: '2026-01-15'
            };
            
            const updated = await tokenModel.updateToken(tokenId, updates);
            
            expect(updated).toBeDefined();
            expect(updated.id).toBe(tokenId);
            expect(updated.tokenName).toBe('Updated Token Name');
            expect(updated.serviceName).toBe('Updated Service');
    });

    test('updates are persisted in database', async () => {
            const updates = {
                tokenName: 'Persisted Update',
                serviceName: 'Persistence Test',
                tokenValue: 'persist_123',
                description: 'Testing persistence',
                tokenType: 'JWT',
                expiryDate: '2027-03-20'
            };
            
            await tokenModel.updateToken(tokenId, updates);
            
            // Verify by getting all tokens
            const allTokens = await tokenModel.getTokens();
            const updatedToken = allTokens.find(t => t.id === tokenId);
            
            expect(updatedToken).toBeDefined();
            expect(updatedToken.service).toBe('Persistence Test');
    });

    test('throws error for non-existent token', async () => {
            const fakeId = '999999';
            const updates = {
                tokenName: 'Should Fail',
                serviceName: 'Service',
                tokenValue: 'value',
                tokenType: 'API_KEY'
            };
            
            await expect(
                tokenModel.updateToken(fakeId, updates)
            ).rejects.toThrow('not found');
    });

});

// deleteToken tests
describe('deleteToken', () => {
    test('deletes existing token', async () => {
        const token = await tokenModel.addToken({
            tokenName: 'Delete Me',
            serviceName: 'Delete Service',
            tokenValue: 'delete_123',
            tokenType: 'API_KEY'
        });

        const tokenId = token.id;

        const result = await tokenModel.deleteToken(tokenId);

        expect(result).toBeDefined();
        expect(result.deleted).toBe(true);
        expect(result.id).toBe(tokenId);
    });

    test('token is removed from database', async () => {
            // Create a token
            const token = await tokenModel.addToken({
                tokenName: 'Verify Deletion',
                serviceName: 'Deletion Test',
                tokenValue: 'verify_delete_123',
                tokenType: 'PERSONAL_ACCESS_TOKEN'
            });
            
            const tokenId = token.id;
            
            await tokenModel.deleteToken(tokenId);
            
            const allTokens = await tokenModel.getTokens();
            const deletedToken = allTokens.find(t => t.id === tokenId);
            
            expect(deletedToken).toBeUndefined();
    });

    test('throws error for non-existent token', async () => {
            const fakeId = '999999';
            
            await expect(
                tokenModel.deleteToken(fakeId)
            ).rejects.toThrow('not found');
    });
        
        test('deleting same token twice throws error', async () => {
            // Create and delete a token
            const token = await tokenModel.addToken({
                tokenName: 'Double Delete',
                serviceName: 'Service',
                tokenValue: 'double_123',
                tokenType: 'API_KEY'
            });
            
            await tokenModel.deleteToken(token.id);
            await expect(
                tokenModel.deleteToken(token.id)
            ).rejects.toThrow('not found');
        });
});

// integrated tests
describe('integration tests', () => {
        test('complete CRUD lifecycle', async () => {
            // 1. CREATE
            const newToken = await tokenModel.addToken({
                tokenName: 'Lifecycle Token',
                serviceName: 'Lifecycle Service',
                tokenValue: 'lifecycle_123',
                description: 'Testing full lifecycle',
                tokenType: 'API_KEY',
                expiryDate: '2025-12-31'
            });
            
            const tokenId = newToken.id;
            createdTokenIds.push(tokenId);
            
            expect(newToken.id).toBeDefined();
            
            // 2. READ
            const allTokens = await tokenModel.getTokens();
            const foundToken = allTokens.find(t => t.id === tokenId);
            expect(foundToken).toBeDefined();
            
            // 3. UPDATE
            const updated = await tokenModel.updateToken(tokenId, {
                tokenName: 'Updated Lifecycle',
                serviceName: 'Updated Service',
                tokenValue: 'updated_lifecycle_456',
                description: 'Updated lifecycle',
                tokenType: 'OAUTH',
                expiryDate: '2026-06-30'
            });
            expect(updated.tokenName).toBe('Updated Lifecycle');
            
            // 4. DELETE
            const deleted = await tokenModel.deleteToken(tokenId);
            expect(deleted.deleted).toBe(true);
            
            // 5. VERIFY DELETION
            const tokensAfterDelete = await tokenModel.getTokens();
            const shouldNotExist = tokensAfterDelete.find(t => t.id === tokenId);
            expect(shouldNotExist).toBeUndefined();
        });
        
        test('handles multiple tokens', async () => {
            const tokens = [];
            
            // Create 5 tokens
            for (let i = 1; i <= 5; i++) {
                const token = await tokenModel.addToken({
                    tokenName: `Batch Token ${i}`,
                    serviceName: `Service ${i}`,
                    tokenValue: `batch_value_${i}`,
                    tokenType: 'API_KEY',
                    expiryDate: `2025-${String(i).padStart(2, '0')}-15`
                });
                tokens.push(token.id);
                createdTokenIds.push(token.id);
            }
            
            // Verify all exist
            const allTokens = await tokenModel.getTokens();
            
            for (const id of tokens) {
                const found = allTokens.find(t => t.id === id);
                expect(found).toBeDefined();
            }
            
            // Delete all
            for (const id of tokens) {
                await tokenModel.deleteToken(id);
            }
        });
    });

// encryption tests
    describe('encryption tests', () => {
        test('tokens are stored encrypted in db', async () => {
            const testData = {
                tokenName: 'Encryption Test',
                serviceName: 'Test Service',
                tokenValue: 'plaintext_secret_123',
                tokenType: 'API_KEY'
            };

            const newToken = await tokenModel.addToken(testData);
            createdTokenIds.push(newToken.id);
            const rawDb = require('./db');

            const row = await new Promise((resolve, reject) => {
                rawDb.get('SELECT token_value FROM api_tokens WHERE id = ?', [newToken.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            })
                // Encrypted value should NOT equal plaintext
                expect(row.token_value).not.toBe('plaintext_secret_123');
                // Encrypted value should contain : separators (iv:ciphertext:tag)
                expect(row.token_value).toContain(':');
                // Should have 3 parts
                expect(row.token_value.split(':').length).toBe(3);
        });

        test('decryption returns original value', async () => {
            const originalValue = 'my_secret_token_xyz';
            const testData = {
                tokenName: 'Decrypt Test',
                serviceName: 'Test Service',
                tokenValue: originalValue,
                tokenType: 'API_KEY'
            };

            const newToken = await tokenModel.addToken(testData);
            createdTokenIds.push(newToken.id);

            const [decryptedToken] = await tokenModel.getTokensById([newToken.id]);

            expect(decryptedToken.value).toBe(originalValue);
        });

        test('encryption round-trip preserves data', async () => {
            const testValues = [
                'simple_token',
                'token-with-dashes',
                'token_with_underscores',
                'TokenWithMixedCase123',
                'token.with.dots',
                'very_long_token_' + 'x'.repeat(500)
            ];
            for (const value of testValues) {
                const token = await tokenModel.addToken({
                    tokenName: `Test ${value.substring(0, 10)}`,
                    serviceName: 'Round Trip Test',
                    tokenValue: value,
                    tokenType: 'API_KEY'
                });
                createdTokenIds.push(token.id);

                const [retrieved] = await tokenModel.getTokensById([token.id]);
                expect(retrieved.value).toBe(value);
            }
        })
    });

// edge case tests
    describe('edge case tests', () => {
        test('handles empty token value', async () => {
            const testData = {
                tokenName: 'Empty Token',
                serviceName: 'Test Service',
                tokenValue: '',  
                tokenType: 'API_KEY'
            };
            const newToken = await tokenModel.addToken(testData);
            createdTokenIds.push(newToken.id);
            
            const [retrieved] = await tokenModel.getTokensById([newToken.id]);
            expect(retrieved.value).toBe('');
        });

        test('handles very long token values', async () => {
            const longToken = 'ghp_' + 'a'.repeat(1000); // 1000+ character token
            const testData = {
                tokenName: 'Long Token',
                serviceName: 'GitHub',
                tokenValue: longToken,
                tokenType: 'PERSONAL_ACCESS_TOKEN'
            };
            
            const newToken = await tokenModel.addToken(testData);
            createdTokenIds.push(newToken.id);
            
            const [retrieved] = await tokenModel.getTokensById([newToken.id]);
            expect(retrieved.value).toBe(longToken);
            expect(retrieved.value.length).toBe(1004);
        });

        test('handles special characters in token values', async () => {
            const specialChars = 'token!@#$%^&*(){}[]|\\:";\'<>?,./~`';
            const testData = {
                tokenName: 'Special Chars',
                serviceName: 'Test',
                tokenValue: specialChars,
                tokenType: 'API_KEY'
            };
            
            const newToken = await tokenModel.addToken(testData);
            createdTokenIds.push(newToken.id);
            
            const [retrieved] = await tokenModel.getTokensById([newToken.id]);
            expect(retrieved.value).toBe(specialChars);
        });

        test('handles unicode characters', async () => {
            const unicode = '🔐 Secret Token 密钥 🗝️';
            const testData = {
                tokenName: 'Unicode Test',
                serviceName: 'Test',
                tokenValue: unicode,
                tokenType: 'API_KEY'
            };
            
            const newToken = await tokenModel.addToken(testData);
            createdTokenIds.push(newToken.id);
            
            const [retrieved] = await tokenModel.getTokensById([newToken.id]);
            expect(retrieved.value).toBe(unicode);
        });
    
        test('getTokensById returns empty array for empty input', async () => {
            const tokens = await tokenModel.getTokensById([]);
            expect(tokens).toEqual([]);
        });

        test('getTokensById returns empty array for null input', async () => {
            const tokens = await tokenModel.getTokensById(null);
            expect(tokens).toEqual([]);
        });
    
        test('getTokensById handles non-existent IDs gracefully', async () => {
            const tokens = await tokenModel.getTokensById(['99999', '88888']);
            expect(tokens).toEqual([]);
        });

        test('getTokensById handles mix of valid and invalid IDs', async () => {
            const validToken = await tokenModel.addToken({
                tokenName: 'Valid Token',
                serviceName: 'Test',
                tokenValue: 'valid_123',
                tokenType: 'API_KEY'
            });
            createdTokenIds.push(validToken.id);
            
            // Mix valid and invalid IDs
            const tokens = await tokenModel.getTokensById([validToken.id, '99999']);
            
            expect(tokens.length).toBe(1);
            expect(tokens[0].id).toBe(validToken.id);
        });

        test('handles missing optional fields', async () => {
            const minimalData = {
                tokenName: 'Minimal',
                serviceName: 'Service',
                tokenValue: 'value_123',
                tokenType: 'API_KEY'
                // No description, no expiryDate
            };
            
            const newToken = await tokenModel.addToken(minimalData);
            createdTokenIds.push(newToken.id);
            
            const [retrieved] = await tokenModel.getTokensById([newToken.id]);
            expect(retrieved.description).toBeFalsy();
            expect(retrieved.expiryDate).toBeFalsy();
        });

        test('prevents SQL injection in token values', async () => {
            const sqlInjection = "'; DROP TABLE api_tokens; --";
            const testData = {
                tokenName: 'SQL Injection Test',
                serviceName: 'Security Test',
                tokenValue: sqlInjection,
                tokenType: 'API_KEY'
            };
            
            const newToken = await tokenModel.addToken(testData);
            createdTokenIds.push(newToken.id);
            
            // Verify token was stored safely
            const [retrieved] = await tokenModel.getTokensById([newToken.id]);
            expect(retrieved.value).toBe(sqlInjection);
            
            // Verify table still exists by querying it
            const allTokens = await tokenModel.getTokens();
            expect(allTokens).toBeDefined();
        });

        test('handles concurrent token creation', async () => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    tokenModel.addToken({
                        tokenName: `Concurrent ${i}`,
                        serviceName: 'Test',
                        tokenValue: `value_${i}`,
                        tokenType: 'API_KEY'
                    })
                );
            }
            
            const tokens = await Promise.all(promises);
            tokens.forEach(t => createdTokenIds.push(t.id));
            
            expect(tokens.length).toBe(10);
            // All IDs should be unique
            const ids = tokens.map(t => t.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(10);
        });
    });

    // error handling tests
    describe('error handling', ()=> {
        test('updateToken fails gracefully with encryption error', async () => {
            // First create a token
            const token = await tokenModel.addToken({
                tokenName: 'Test',
                serviceName: 'Test',
                tokenValue: 'test_123',
                tokenType: 'API_KEY'
            });
            createdTokenIds.push(token.id);

            const updates = {
                tokenName: 'Updated',
                serviceName: 'Updated',
                tokenValue: null, // This should cause issues
                tokenType: 'API_KEY'
            };
            
            await expect(
                tokenModel.updateToken(token.id, updates)
            ).rejects.toThrow();
        });

        test('addToken fails with missing required fields', async () => {
            const invalidData = {
                tokenName: 'Test',
                // Missing serviceName, tokenValue, tokenType
            };
            
            await expect(
                tokenModel.addToken(invalidData)
            ).rejects.toThrow();
        });

        test('handles database constraint violations gracefully', async () => {
            const testData = {
                tokenName: 'Constraint Test',
                serviceName: 'Test',
                tokenValue: 'value_123',
                tokenType: 'INVALID_TYPE'  // Not in CHECK constraint
            };
            
            await expect(
                tokenModel.addToken(testData)
            ).rejects.toThrow();
        });
    });

    // boundary tests
    describe('boundary tests', () => {
        test('handles token with all fields at maximum length', async () => {
            const maxLengthData = {
                tokenName: 'a'.repeat(255),  // Assuming VARCHAR(255)
                serviceName: 'b'.repeat(255),
                tokenValue: 'c'.repeat(1000),
                description: 'd'.repeat(500),
                tokenType: 'PERSONAL_ACCESS_TOKEN', // Longest valid type
                expiryDate: '9999-12-31'
            };
            
            const newToken = await tokenModel.addToken(maxLengthData);
            createdTokenIds.push(newToken.id);
            
            const [retrieved] = await tokenModel.getTokensById([newToken.id]);
            expect(retrieved.token).toBe(maxLengthData.tokenName);
            expect(retrieved.value).toBe(maxLengthData.tokenValue);
        });

        test('getTokensById handles large array of IDs', async () => {
            // Create 50 tokens
            const ids = [];
            for (let i = 0; i < 50; i++) {
                const token = await tokenModel.addToken({
                    tokenName: `Batch ${i}`,
                    serviceName: 'Test',
                    tokenValue: `value_${i}`,
                    tokenType: 'API_KEY'
                });
                ids.push(token.id);
                createdTokenIds.push(token.id);
            }
            
            // Retrieve all 50
            const tokens = await tokenModel.getTokensById(ids);
            expect(tokens.length).toBe(50);
        });

        test('handles rapid successive operations', async () => {
            // Create
            const token = await tokenModel.addToken({
                tokenName: 'Rapid Test',
                serviceName: 'Test',
                tokenValue: 'value_1',
                tokenType: 'API_KEY'
            });
            createdTokenIds.push(token.id);
            
            // Update immediately
            await tokenModel.updateToken(token.id, {
                tokenName: 'Updated',
                serviceName: 'Test',
                tokenValue: 'value_2',
                tokenType: 'API_KEY'
            });
            
            // Read immediately
            const [retrieved] = await tokenModel.getTokensById([token.id]);
            expect(retrieved.value).toBe('value_2');
            // Delete immediately
            await tokenModel.deleteToken(token.id);
            
            // Verify deleted
            const tokens = await tokenModel.getTokensById([token.id]);
            expect(tokens.length).toBe(0);
        });
        
    });
});