const Cookies = require('js-cookie');
const createHash = require('sha.js')
const Evaporate = require('evaporate');
const SparkMD5 = require('spark-md5');

const request = function (method, url, data, headers, cb) {
        let req = new XMLHttpRequest()
        req.open(method, url, true)

        Object.keys(headers).forEach(function (key) {
            req.setRequestHeader(key, headers[key])
        });

        req.onload = function () {
            cb(req.status, req.responseText)
        };

        req.onerror = req.onabort = function () {
            console.log('Sorry, failed to upload file.')
        };

        req.send(data)
    };

const parseNameFromUrl = function (url) {
    return decodeURIComponent((url + '').replace(/\+/g, '%20'));
};

const finishUpload = function (awsBucketUrl, objectKey) {
    console.log(awsBucketUrl + '/' + objectKey);
    //link.setAttribute('href', url.value);
    //link.innerHTML = parseNameFromUrl(url.value).split('/').pop();

    //element.className = 's3direct link-active';
    //element.querySelector('.bar').style.width = '0%';
    //disableSubmit(false);
};

const computeMd5 = function (data) {
    return btoa(SparkMD5.ArrayBuffer.hash(data, true));
};

const computeSha256 = function (data) {
    return createHash('sha256').update(data, 'utf-8').digest('hex');
};

const initiateMultipartUpload = function (csrfToken, signingUrl, objectKey, awsKey, awsRegion, awsBucket, awsBucketUrl, cacheControl, contentDisposition, acl, serverSideEncryption, file) {
    // Enclosed so we can propagate errors to the correct `element` in case of failure.
    const getAwsV4Signature = function (signParams, signHeaders, stringToSign, signatureDateTime, canonicalRequest) {
        return new Promise(function (resolve, reject) {
            const form          = new FormData(),
                  headers       = {'X-CSRFToken': csrfToken};
            form.append('to_sign', stringToSign);
            form.append('datetime', signatureDateTime);
            request('POST', signingUrl, form, headers, function (status, response) {
                switch (status) {
                    case 200:
                        resolve(response);
                        break;
                    default:
                        console.log('Could not generate AWS v4 signature.');
                        reject();
                        break;
                }
            });
        })
    };

    const generateAmazonHeaders = function (acl, serverSideEncryption) {
        // Either of these may be null, so don't add them unless they exist:
        let headers = {}
        if (acl) headers['x-amz-acl'] = acl;
        if (serverSideEncryption) headers['x-amz-server-side-encryption'] = serverSideEncryption;
        return headers;
    };

    Evaporate.create(
        {
            //signerUrl: signingUrl,
            customAuthMethod: getAwsV4Signature,
            aws_key: awsKey,
            bucket: awsBucket,
            awsRegion: awsRegion,
            computeContentMd5: true,
            cryptoMd5Method: computeMd5,
            cryptoHexEncodedHash256: computeSha256,
            partSize: 20 * 1024 * 1024,
            logging: true,
            debug: true,
            allowS3ExistenceOptimization: true,
            s3FileCacheHoursAgo: 12,
        }
    ).then(function (evaporate) {
        evaporate.add({
            name: objectKey,
            file: file,
            contentType: file.type,
            xAmzHeadersAtInitiate: generateAmazonHeaders(acl, serverSideEncryption),
            notSignedHeadersAtInitiate: {'Cache-Control': cacheControl, 'Content-Disposition': contentDisposition},
        }).then(
            function (awsS3ObjectKey) {
                console.log('Successfully uploaded to:', awsS3ObjectKey);
                finishUpload(awsBucketUrl, awsS3ObjectKey);
            },
            function (reason) {
                console.error('Failed to upload because:', reason);
            }
        )
    });
};

global.testFunction = function(inputElement){
    let file = inputElement.files[0];

    if (!file){
        console.log('no file found!');
        return;
    }

    var data = {
        'dest': "thrive_media_destination",
        'name': file.name,
        'type': file.type,
        'size': file.size
    }

    var csrftoken = Cookies.get('csrftoken');//document.getElementsByName("csrfmiddlewaretoken")[0].value;

    
    var headers = new Headers();
    headers.append('X-CSRFToken', csrftoken);
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
    //headers.append('Accept', 'application/x-www-form-urlencoded; charset=utf-8');

    var data_url = '/API/s3direct/get_upload_params/';
    var signing_url = '/API/s3direct/get_aws_v4_signature/';

    data = Object.keys(data).map((key) => {
          return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
        }).join('&');

    console.log(initiateMultipartUpload);

    fetch(data_url, {
        body: data, // must match 'Content-Type' header
        headers: headers,
        credentials: 'same-origin',
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
      })
    .then(response => {
        if (!response.ok) {
            throw Error(response.statusText);
        }

        return response.json();
    })
    .then(uploadParameters => {
        initiateMultipartUpload(
                    csrftoken,
                    signing_url,
                    uploadParameters.object_key,
                    uploadParameters.access_key_id,
                    uploadParameters.region,
                    uploadParameters.bucket,
                    uploadParameters.bucket_url,
                    uploadParameters.cache_control,
                    uploadParameters.content_disposition,
                    uploadParameters.acl,
                    uploadParameters.server_side_encryption,
                    file
        )
    })
    .catch(error => console.log("can't get upload URL"));
    
}
