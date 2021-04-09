# SMIL player

- This solution is beta version of [signageOS SMIL Player](https://docs.signageos.io/category/smil-guides) applet.

## SMIL mandatory structure
```xml
<smil>
    <head>
        <layout>
            <root-layout width="1080" height="1920" backgroundColor="#FFFFFF" />
            <region regionName="video" left="0" top="0" width="1080" height="1920" z-index="1" backgroundColor="#FFFFFF" mediaAlign="center" />
        </layout>
    </head>
    <body>
        <par> 
            Whole playlist goes here
        </par> 
    </body>
</smil>
```
## Supported SMIL  playlist tags
- par and seq are fully supported
- smil timings ( wallclock, repeatCount ) are fully supported
- priorityClass and excl are treated as seq tags in this PoC version

## Necessary attributes in SMIL file
- region name has to be specified in one of these two ways
```
<region regionName="widget12"..../>
<region xml:id="widget12" .... />
```
- accepts only url to SMIL file ( form input at main page ), local storage is not supported
- url to SMIL file can be also passed as smilUrl variable via SoS timings
- all files ( audio, video.. ) must be stored on remote server,  local storage is not supported

## Supported features
- sequential and parallel play of audio, video, image and widget
- priority playlist
- supports simple layering ( z-index ) with videos always played on background ( lowest level ) 
- pairs all media with proper regions from layout part of SMIL, if no region specified, uses values from root-layout tag
- plays media in endless loops if necessary ( one element as well as multiple )
- supports prefetch event ( plays intro while downloading rest of the files )
- downloads all necessary files from remote server, stores files in local storage
- downloads and extracts of widgets into local storage
- checks for changes in provided SMIL file as well as checks for all files linked in SMIL
- ability to restart on SMIL file change
- supports media scheduling using wallclock definition
- supports playing media loops using repeatCount attribute, possible to combine with wallclock
- supports sensors-based triggers
- supports conditional expressions

### Used technology
- webpack, typescript, mocha, xml2js, json-easy-filter

### Code documentation
- See documentation [here](docs/documentation.md)

### SMIL documentation
- See documentation for [SMIL file creation](https://docs.signageos.io/category/smil-docs-guides)

## Development
For development internally in signageOS team, there are a few specifics. We are using internal private NPM registry, so please copy the template .npmrc.template to .npmrc and adjust your local PC ~/.bashrc file as below (for unix systems, for Win add environment variables in windows This PC options).

```sh
echo 'export NPM_REGISTRY_URL="https://npm.signageos.io"' >> ~/.bashrc
echo 'export NPM_REGISTRY_HOST="npm.signageos.io"' >> ~/.bashrc
echo 'export NPM_AUTH_TOKEN="__PASTE_YOUR_SECRET_TOKEN__"' >> ~/.bashrc
cp .npmrc.template .npmrc
```
