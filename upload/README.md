# Upload Files Here

Have you ever needed to upload files from a computer to your own server and not had any
tools besides a web browser available to you?  If so, then this little web server is for you.
It serves a simple upload form on GET requests and saves those uploads to the current directory
on POST requests.

Once upon a time, I wrote a CGI script to do this, but that's been lost in the sands of time,
so it's been reborn again as Javascript using [micro](https://github.com/zeit/micro).

## Setup

```sh
cd upload
yarn
```

## Usage

```sh
micro
```
