THREE.ColladaArchiveLoader = function ( manager ) {

    this._colladaLoader = new THREE.ColladaLoader( manager );

}

THREE.ColladaArchiveLoader.prototype = { 

    constructor: THREE.ColladaArchiveLoader,

    crossOrigin: 'Anonymous',

    load: function ( url, onLoad, onProgress, onError ) {

        var scope = this;

        var path = scope.path === undefined ? THREE.LoaderUtils.extractUrlBase( url ) : scope.path;

        var loader = new THREE.FileLoader( scope.manager );
        loader.load( url, function ( data ) { 

            // onLoad( scope.parse( text, path ) );

        }, onProgress, onError );
    },

    setCrossOrigin: function ( value ) {

        this._colladaLoader.setCrossOrigin( value );

    },

    parse: function ( data, onLoad ) { 

        if ( window.JSZip == null ) {

            console.warn( 'ColladaArchiveLoader : JSZip is required to unpack a Collada archive file.' );
            return null;

        }

        ( async function () {
            
            try {
                
                var zip = await ((new JSZip()).loadAsync( data, { base64: true } ));

                var manifest = await zip.file( 'manifest.xml' ).async( 'string' );
                var manifestxml = (new DOMParser()).parseFromString( manifestxml, 'application/xml' );

                var entryfile = manifestxml
                    .children
                    .filter( c => c.tagName === 'dae_root' )[0]
                    .textContent
                    .trim();

                // get the dae text
                // TODO: how does this work if it's nested?
                var daefile = await zip.file( entryfile ).async( 'string' );

                // set the callback for fetching textures
                this._colladaLoader.textureLoader = function( image, textureLoader ) {

                    // TODO: read image from the zip file
                    return textureLoader.load( image );

                }

                // parse the result
                var result = this._colladaLoader.parse( text );

                // return the data
                onLoad( result );

            } catch ( e ) {

                console.error( 'ColladaArchiveLoader : The Collada archive file is not valid.' );
                console.error( e );

            }

        } )();

    }

}