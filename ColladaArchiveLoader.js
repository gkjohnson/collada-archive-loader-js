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

            scope.parse( text, onLoad );

        }, onProgress, onError );
    },

    setCrossOrigin: function ( value ) {

        this._colladaLoader.setCrossOrigin( value );

    },

    parse: function( data, onLoad ) { 

        function cleanPath( path ) {

            if ( /^file:/.test( path ) ) {

                console.warn( 'ColladaArchiveLoader : file:// URI not supported.' );
                return '';

            }

            path = path.replace( /\\+/g, '/' );
            path = path.replace( /^\.?\//, '' );

            var updir = path.match( /(\.\.\/)*/ )[ 0 ].match( /\.\./g ).length;
            var spl = path.split( '/' );
            while (updir --) spl.shift();

            return spl.join( '/' );
        }

        if ( window.JSZip == null ) {

            console.error( 'ColladaArchiveLoader : JSZip is required to unpack a Collada archive file.' );
            return null;

        }

        ( async function () {
            
            try {
                
                var zip = await ((new JSZip()).loadAsync( data, { base64: true } ));

                // Find the entry file
                var manifest = await zip.file( 'manifest.xml' ).async( 'string' );
                var entryfile;

                if ( manifest == null ) {

                    var files = zip.file(/\.dae$/);

                    if ( files.length === 0 ) {

                        console.error( 'ColladaArchiveLoader : No manifest found and no Collada file found to load.' );

                    } 

                    if ( files.length >= 2 ) {

                        console.error( 'ColladaArchiveLoader : No manifest found and more than one Collada file found to load.' );

                    }

                    entryfile = files[0].name;

                } else {

                    var manifestxml = manifest && (new DOMParser()).parseFromString( manifestxml, 'application/xml' );
                    entryfile = manifestxml
                        .children
                        .filter( c => c.tagName === 'dae_root' )[0]
                        .textContent
                        .trim();

                }

                entryfile = cleanPath( entryfile );

                // get the dae file and directory
                var dir = entryfile.replace ( /[^\/]*$/g, '' );
                var daefile = await zip.file( entryfile ).async( 'string' );

                // set the callback for fetching textures
                this._colladaLoader.loadTexture = function( image, textureLoader ) {

                    ( async function () {
                        var texpath = cleanPath( `${ dir }/${ image }` );
                        var ext = texpath.match( /[^\.]$/ )[0];
                        var data = await zip.file( texpath ).async( 'uint8' );

                        // Decode the text data
                        var data64 = btoa( ( new TextDecoder() ).decode( data ) );

                        // Create data url with the extension
                        var dataurl = `data:image/png;base64,${ data64 }`;

                    } )()
                    
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