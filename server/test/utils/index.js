const Lab = require('@hapi/lab')

// prepare environment
const { it, describe } = (exports.lab = Lab.script())

const { expect, fail } = require('@hapi/code')

const { flatten } = require('../../src/utils')

describe('@utils::AWSFileHandler', () => {
    const region = 'my-region'
    const bucket = 'a-bucket'

    const AWSFileHandler = require('../../src/utils/AWSFileHandler')
    const fileHandler = new AWSFileHandler(region, bucket)

    it('should generate a key combined with a /', () => {
        const key = fileHandler.generateKey('a', 'b')
        expect(key).to.equal('a/b')
    })

    it('should return an instance of AWS.S3 using apiVersion 2006-03-01 and region as instansiated ', () => {
        const api = fileHandler.api

        expect(api.config.apiVersion).to.equal('2006-03-01')
        expect(api.config.region).to.equal(region)
    })
})

describe('@utils::flatten', () => {
    it('should flatten 2-dimensional array', () => {
        const arr = [
            [1, 2],
            [3, 4],
        ]
        const expected = [1, 2, 3, 4]

        const flat = flatten(arr)

        expect(flat).to.be.an.array()

        flat.every((val, i) => {
            expect(val).to.equal(expected[i])
        })
    })

    it('should flatten 1 and 2 mixed -dimensional array', () => {
        const arr = [1, 2, [3, 4], 5, 6]
        const expected = [1, 2, 3, 4, 5, 6]

        const flat = flatten(arr)

        expect(flat).to.be.an.array()

        flat.every((val, i) => {
            expect(val).to.equal(expected[i])
        })
    })
})

describe('@utils::LocalFileSystemHandler', () => {
    const LocalFileSystemHandler = require('../../src/utils/LocalFileSystemHandler')

    it('should contain the same contents on disk after upload as the original', async () => {
        const path = require('path')
        const fs = require('fs')

        const handler = new LocalFileSystemHandler()
        const testFile = path.join(__dirname, 'testfile.json')

        const testFileBuffer = await fs.promises.readFile(testFile)

        try {
            const destinationFilename = 'the-uploaded-file.json'
            const destinationPath = 'test-directory'

            //save the file
            await handler.saveFile(
                destinationPath,
                destinationFilename,
                testFileBuffer
            )

            //then compare it to the original
            const uploadedFileData = await fs.promises.readFile(
                path.join(
                    handler.directory,
                    destinationPath,
                    destinationFilename
                )
            )
            expect(uploadedFileData.toString()).to.equal(
                testFileBuffer.toString()
            )
        } catch (err) {
            fail(
                `should not get an error saving file to disk, got error: ${err.message}`
            )
        }
    })

    it('should throw an error if trying to save a file outside the upload root directory', async () => {
        const handler = new LocalFileSystemHandler()

        await expect(
            handler.saveFile('../whatever', 'file', Buffer.from('foobar'))
        ).to.reject(Error)
    })

    it('should not allow getting a file outside of the upload directory root', async () => {
        const handler = new LocalFileSystemHandler()

        await expect(handler.getFile('/etc', 'passwd')).to.reject(Error)
    })
})

describe('utils::getServerUrl', () => {
    const getServerUrl = require('../../src/utils/getServerUrl')

    it('should return a full url including protocol', () => {
        const mockRequest = {
            server: {
                info: {
                    protocol: 'http',
                },
            },
            info: {
                hostname: 'mydomain.com',
            },
            headers: {},
        }

        const expected = 'http://mydomain.com/api'
        const actual = getServerUrl(mockRequest)

        expect(actual).to.equal(expected)
    })

    it('should override forwarded protocol if behind a proxy', () => {
        const mockRequest = {
            server: {
                info: {
                    protocol: 'http',
                },
            },
            info: {
                hostname: 'mydomain.com',
            },
            headers: {
                'x-forwarded-proto': 'https',
            },
        }

        const expected = 'https://mydomain.com/api'
        const actual = getServerUrl(mockRequest)

        expect(actual).to.equal(expected)
    })

    it('should override port if not a standard port for the specified protocol', () => {
        const mockRequest = {
            server: {
                info: {
                    protocol: 'http',
                    port: 1234,
                },
            },
            info: {
                hostname: 'mydomain.com',
            },
            headers: {},
        }

        const expected = 'http://mydomain.com:1234/api'
        const actual = getServerUrl(mockRequest)

        expect(actual).to.equal(expected)
    })

    it('should override both protocol and port if behind a proxy on a non standard port', () => {
        const mockRequest = {
            server: {
                info: {
                    protocol: 'http',
                },
            },
            info: {
                hostname: 'mydomain.com',
            },
            headers: {
                'x-forwarded-proto': 'https',
                'x-forwarded-port': '1234',
            },
        }

        const expected = 'https://mydomain.com:1234/api'
        const actual = getServerUrl(mockRequest)

        expect(actual).to.equal(expected)
    })

    it('should override both protocol, port and domain if behind a proxy on a non standard port', () => {
        const mockRequest = {
            server: {
                info: {
                    protocol: 'http',
                },
            },
            info: {
                hostname: 'mydomain.com',
            },
            headers: {
                'x-forwarded-proto': 'https',
                'x-forwarded-port': '1234',
                'x-forwarded-host': 'foobar.com',
            },
        }

        const expected = 'https://foobar.com:1234/api'
        const actual = getServerUrl(mockRequest)

        expect(actual).to.equal(expected)
    })
})
