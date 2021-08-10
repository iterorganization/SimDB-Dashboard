$( function() {
    const ac = new Autocomplete($( "#myAutocomplete" )[0], {
        maximumItems: 5,
        treshold: 1,
        onSelectItem: ({label, value}) => {
            console.log("user selected:", label, value);
        }
    });

    var data = undefined;

    var process_array_key = function( word ) {
        return word.replace(/(.*)#(\d+)/, '$1[$2]')
    }

    var capitalize = function( word ) {
        return word[0].toUpperCase() + word.slice(1);
    }

    var to_label = function( name ) {
        return name.split(/[\._]/).map(process_array_key).map(capitalize).join(' ');
    }

    $.ajax({
        url: "http://127.0.0.1:5000/api/v1.0/metadata",
        success: function( result ) {
            var data = result.map(el => { return { "value": el.name, "label": to_label(el.name) }; });
            ac.setData(data);
            data = result;
        }
    });

    $( '#add-search-btn' ).bind( 'click', function( event ) {
        var fields = $( '#search-fields' );
        var div = $( "<div class='input-group mb-3'>" );
        var input = $( "<input class='form-control column col-md-4' id='myAutocomplete'/>" );
        div.append(input);
        div.append($( "<input class='form-control'/>" ));
        fields.append(div);
        var ac = new Autocomplete(input[0], {
            data: data,
            maximumItems: 5,
            treshold: 1
        });
    });
});