# Sharer
<img src="https://github.com/MintuJupally/Sharer/blob/master/assets/logo/SharerLogo.png?raw=true" height="150px" align="left"/>

A desktop application to share files across devices connected to the same network without the use of internet. 

It is developed using React JS for the UI and Node JS backend. The application is wrapped with Electron JS and is packaged into a desktop application.

The application allows a sender to share a set of files to multiple receivers at the same time. There are no restrictions or limit set over the number of files or the size of files that can be shared through the application. 

Speed of the file transfer depends on the bandwidth of the network connected to and also on the number of receivers involved in the file transfer.

## How does it work
When a sender starts a SHARE session, all the receivers on the same network can discover the sender's device through the application's RECEIVE session and connect to it. 
The application uses Socket IO to stream files between the sender and the receivers.

