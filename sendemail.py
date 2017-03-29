import smtplib
import os
import sys
from smtplib import SMTPException
import json

sender = 'info@gdeals.net'
receivers = ['info@gdeals.net']


name = sys.argv[1];
email = sys.argv[2];
subject= sys.argv[3];
message2 = sys.argv[4];


message = """From:<info@gdeals.net>
To: <info@gdeals.net>
Subject: """
message = message+subject

message3 = """

Message from a client.\r\n"""

headline_client="client name :\r\n"
headline_email="\r\n email :\r\n"
headline_content="\r\n content: \r\n"

message = message+message3+headline_client+name+headline_email+email+headline_content+message2

try:
   session = smtplib.SMTP('mail.gdeals.net')
   session.ehlo()
   session.starttls()
   session.ehlo()
   session.login(sender,'YomTov78')
   session.sendmail(sender,receivers,message)
   print "Successfully sent email"
except smtplib.SMTPException:
   print "Error: unable to send email"

sys.exit(0)
