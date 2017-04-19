import smtplib
import os
import sys
from smtplib import SMTPException
import json

sender = 'golddealshelp@gmail.com'
receivers = [ sys.argv[2]]


name = sys.argv[1];
email = sys.argv[2];
subject= sys.argv[3];
message2 = sys.argv[4];


message = """From:<golddealshelp@gmail.com>
To: <"""+sys.argv[2]+""">
Subject: """
message = message+subject

message3 = """

\r\n"""

headline_client="client user name :\r\n"
headline_email="\r\n email :\r\n"
headline_content="\r\n\r\n"

message = message+message3+headline_client+name+headline_content+message2

try:
   session = smtplib.SMTP('smtp.gmail.com',587)
   session.ehlo()
   session.starttls()
   session.ehlo()
   session.login(sender,'Prime199@')
   session.sendmail(sender,receivers,message)
   print "Successfully sent email"
except smtplib.SMTPException:
   print sys.exc_info()[0]
   print "Error: unable to send email"

sys.exit(0)
