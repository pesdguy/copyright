import cv2
import time
import sys
import json
from imgurpython import ImgurClient
import urllib



client_id = '66e1481338b4654'
client_secret = '228a7e9dc1da979766005d523d1c60580c570a2d'
client = ImgurClient(client_id, client_secret)

config = {
		'album': None,
		'name':  'Catastrophe!'
	}

print("Uploading image... ")
#image = client.upload_from_path('show.jpg', config=config, anon=False)
print("Done")

#urllib.urlretrieve("http://i.imgur.com/5jAqKIL.jpg", "test.jpg")
#data=json.loads(sys.argv[1])
#json_string = '{"first_name": "Guido", "last_name":"Rossum"}'




parsed_json = json.loads(sys.argv[1])
ImageArr = parsed_json['images']
a = time.time()
i = 0
for item in ImageArr:
    # download image to the same name + 'new'
    urllib.urlretrieve(item['image_link'],item['image_name']+'_new')
    img = cv2.imread(item['image_name']+'_new')
    rows, cols, var = img.shape
    M = cv2.getRotationMatrix2D((cols/2,rows/2),5,0.9)
    dst = cv2.warpAffine(img,M,(cols,rows))

    # img2 = np.zeros((rows, cols, var), np.uint8)
    # cv2.rectangle(img2,(0, 0),(cols, rows), (255, 255, 255),-1)

    img2gray = cv2.cvtColor(dst, cv2.COLOR_BGR2GRAY)
    ret, mask = cv2.threshold(img2gray, 10, 255, cv2.THRESH_BINARY)
    mask_inv = cv2.bitwise_not(mask)

    dst[mask_inv == 255] = (255, 255, 255)
    #dst[mask_inv == 255] = (255, 255, 255)
#    dst[mask_inv] = (255,255,255)

#    dst[mask_inv == 255] = (255, 255, 255)

 #   dst[mask == 255] = (255, 255, 255)


    # #    img3 = np.zeros((rows, cols, var), np.uint8)
#     dst5 = cv2.add(img2,dst)
#     img[0:rows, 0:cols] = dst5

    # cv2.circle(img2, (447, 63), 63, (0, 0, 255), -1)

    cv2.imwrite(item['image_name']+'_new.jpg',dst)
    i+=1
b = time.time()
print "finished: "+str(b-a)

# delete image