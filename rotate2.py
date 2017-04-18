import cv2
import time
import sys
import json
from imgurpython import ImgurClient
import urllib
import base64
import requests
import sys


def create_link(file_name,ebayToken):


    xml = '''<?xml version="1.0" encoding="UTF-8"?>
    <UploadSiteHostedPicturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
    <eBayAuthToken>'''+ebayToken+'''</eBayAuthToken>
    </RequesterCredentials>
    </UploadSiteHostedPicturesRequest>'''

    prepared = ""
    headers ={'X-EBAY-API-APP-NAME':'jonathan-copyrigh-PRD-a08f655c9-e9e8b2f9','X-EBAY-API-CALL-NAME':'UploadSiteHostedPictures','X-EBAY-API-COMPATIBILITY-LEVEL':'517','X-EBAY-API-SITEID':'0','X-EBAY-API-DEV-NAME':'7ad38edb-c70f-4e0e-bc78-b8d8d5b04072','X-EBAY-API-CERT-NAME':'PRD-08f655c943dd-78af-45e1-b61c-3e70','X-EBAY-API-DETAIL-LEVEL':'0'}
    url = "api.ebay.com"+"/ws/api.dll"
    files = {'document':(None,xml.replace("\n",""),'text/xml;charset=utf-8'),
             'zobi': ('file0', open(file_name, 'rb'), 'application/octet-stream', {'Content-Transfer-Encoding': 'binary'})}

    try:
        r = requests.post('https://'+url,files=files,headers=headers)
        return r.text
    except:
        return sys.exc_info()[0]





client_id = '66e1481338b4654'
client_secret = '228a7e9dc1da979766005d523d1c60580c570a2d'
client = ImgurClient(client_id, client_secret)

config = {
		'album': None,
		'name':  'Catastrophe!'
	}

#print("Uploading image... ")
#image = client.upload_from_path('show.jpg', config=config, anon=False)
#print("Done")

#urllib.urlretrieve("http://i.imgur.com/5jAqKIL.jpg", "test.jpg")
#data=json.loads(sys.argv[1])
#json_string = '{"first_name": "Guido", "last_name":"Rossum"}'



parsed_json = json.loads(sys.argv[1])

ImageArr = parsed_json['images']
ebayToken = parsed_json['ebayToken']
angle = parsed_json['angle']
a = time.time()
i = 0
arr = []
arr2 = []
for item in ImageArr:
    # download image to the same name + 'new'
    urllib.urlretrieve(item['image_link'],item['image_name']+'_new')
    img = cv2.imread(item['image_name']+'_new')
    rows, cols, var = img.shape
    M = cv2.getRotationMatrix2D((cols/2,rows/2),angle,0.9)
    dst = cv2.warpAffine(img,M,(cols,rows),borderMode=cv2.BORDER_CONSTANT,borderValue=(255,255,255))
  # the same size as it was before.
    new_cols = int(cols*1.111111111111111111111111111111)
    new_rows = int(rows*1.111111111111111111111111111111)
    # at least 500*500
    if (new_cols < 500):
        new_cols = 500
    if (new_rows < 500):
        new_rows = 500
    bigger = cv2.resize(dst, (new_cols,new_rows))

    #cv2.imwrite(item['image_name']+'_new.jpg',dst)
    enc = cv2.imencode('.jpg',bigger)[1]
    #arr.append(base64.encodestring((enc)).replace('\n',''))
    f = open( 'file'+str(i), 'w+' )
    f.write( base64.b64decode( base64.encodestring((enc)).replace('\n','') ) )
    f.close()
    elem = create_link('file'+str(i),ebayToken)
    arr.append(elem)
    arr2.append(elem.split('<FullURL>')[1].split('</')[0])
    #print("finished with file "+str(i))
    i+=1
b = time.time()
print arr
print arr2
print "finished: "+str(b-a)

# delete image