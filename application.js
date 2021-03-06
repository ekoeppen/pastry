///// represents a single document

var pastry_document = function() {
  this.locked = false;
};

// Escapes HTML tag characters
pastry_document.prototype.htmlEscape = function(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
};

// Get this document from the server and lock it here
pastry_document.prototype.load = function(key, callback, lang) {
  var _this = this;
  $.ajax('pastes.php?key=' + encodeURIComponent(key), {
    type: 'get',
    dataType: 'json',
    success: function(res) {
      _this.locked = true;
      _this.key = key;
      _this.data = res.data;
      try {
        var high;
        if (lang === 'txt') {
          high = { value: _this.htmlEscape(res.data) };
        }
        else if (lang) {
          high = hljs.highlight(lang, res.data);
        }
        else if (res.data.substring(160).indexOf('diff') > 0) {
          high = hljs.highlight('diff', res.data);
        }
        else {
          high = hljs.highlightAuto(res.data);
        }
      } catch(err) {
        // failed highlight, fall back on auto
        high = hljs.highlightAuto(res.data);
      }
      callback({
        value: high.value,
        key: key,
        language: high.language || lang,
        lineCount: res.data.split("\n").length
      });
    },
    error: function(err) {
      callback(false);
    }
  });
};

// Save this document to the server and lock it here
pastry_document.prototype.save = function(title, data, callback) {
  if (this.locked) {
    return false;
  }
  this.data = data;
  var _this = this;
  $.ajax('pastes.php', {
    type: 'post',
    data: data,
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'title': title
    },
    success: function(res) {
      _this.locked = true;
      _this.key = res.key;
      var high = hljs.highlightAuto(data);
      callback(null, {
        value: high.value,
        key: res.key,
        language: high.language,
        lineCount: data.split("\n").length
      });
    },
    error: function(res) {
      try {
        callback($.parseJSON(res.responseText));
      }
      catch (e) {
        callback({message: 'Something went wrong!'});
      }
    }
  });
};

// Delete this document from the server
pastry_document.prototype.delete = function(callback) {
  if (!this.locked) {
    return false;
  }
  $.ajax('pastes.php?key=' + encodeURIComponent(this.key), {
    type: 'delete',
    success: function(res) {
      callback(null);
    },
    error: function(res) {
      try {
        callback($.parseJSON(res.responseText));
      }
      catch (e) {
        callback({message: 'Something went wrong!'});
      }
    }
  });
};

///// represents the paste application

var pastry = function(appName, options) {
  this.appName = appName;
  this.$textarea = $('textarea');
  this.$box = $('#box');
  this.$titlebox = $('#titlebox');
  this.$doctitle = $('#doctitle');
  this.$code = $('#box code');
  this.$linenos = $('#linenos');
  this.$documents = $('#documents');
  this.options = options;
  this.configureShortcuts();
  this.configureButtons();
  this.getDocuments();
};

// Get all documents

pastry.prototype.getDocuments = function() {
  var _this = this;
  $.ajax('pastes.php?key=%2A', {
    type: 'get',
    dataType: 'json',
    success: function(res) {
      var list = "";
      _this.$documents.empty();
      for (var i in res.data) {
        list += "<div href='" + res.data[i] + "'>" + res.data[i] + "</div>";
      }
      _this.$documents.append(list);
      _this.$documents.children("div").click(function() {
        var key = $(this).attr('href');
        _this.loadDocument(key);
        window.history.pushState(null, null, window.location.pathname + "?" + key);
      });
    },
    error: function(err) {
    }
  });
}

// Set the page title - include the appName
pastry.prototype.setTitle = function(ext) {
  var title = ext ? this.appName + ' - ' + ext : this.appName;
  document.title = title;
};

// Show a message box
pastry.prototype.showMessage = function(msg, cls) {
  var msgBox = $('<li class="'+(cls || 'info')+'">'+msg+'</li>');
  $('#messages').prepend(msgBox);
  setTimeout(function() {
    msgBox.slideUp('fast', function() { $(this).remove(); });
  }, 3000);
};

// Show the light key
pastry.prototype.lightKey = function() {
  this.configureKey(['new', 'save']);
};

// Show the full key
pastry.prototype.fullKey = function() {
  this.configureKey(['new', 'duplicate', 'delete', 'raw']);
};

// Set the key up for certain things to be enabled
pastry.prototype.configureKey = function(enable) {
  var $this, i = 0;
  $('#box2 .function').each(function() {
    $this = $(this);
    for (i = 0; i < enable.length; i++) {
      if ($this.hasClass(enable[i])) {
        $this.addClass('enabled');
        return true;
      }
    }
    $this.removeClass('enabled');
  });
};

// Remove the current document (if there is one)
// and set up for a new one
pastry.prototype.newDocument = function(hideHistory) {
  this.$box.hide();
  this.doc = new pastry_document();
  if (!hideHistory) {
    window.history.pushState(null, this.appName, window.location.pathname);
  }
  this.setTitle();
  this.lightKey();
  this.$textarea.val('').show();
  this.$titlebox.show();
  this.$doctitle.val('').focus();
  this.removeLineNumbers();
};

// Map of common extensions
// Note: this list does not need to include anything that IS its extension,
// due to the behavior of lookupTypeByExtension and lookupExtensionByType
// Note: optimized for lookupTypeByExtension
pastry.extensionMap = {
  rb: 'ruby', py: 'python', pl: 'perl', php: 'php', scala: 'scala', go: 'go',
  xml: 'xml', html: 'xml', htm: 'xml', css: 'css', js: 'javascript', vbs: 'vbscript',
  lua: 'lua', pas: 'delphi', java: 'java', cpp: 'cpp', cc: 'cpp', m: 'objectivec',
  vala: 'vala', cs: 'cs', sql: 'sql', sm: 'smalltalk', lisp: 'lisp', ini: 'ini',
  diff: 'diff', bash: 'bash', sh: 'bash', tex: 'tex', erl: 'erlang', hs: 'haskell',
  md: 'markdown', txt: '', coffee: 'coffee', json: 'javascript'
};

// Look up the extension preferred for a type
// If not found, return the type itself - which we'll place as the extension
pastry.prototype.lookupExtensionByType = function(type) {
  for (var key in pastry.extensionMap) {
    if (pastry.extensionMap[key] === type) return key;
  }
  return type;
};

// Look up the type for a given extension
// If not found, return the extension - which we'll attempt to use as the type
pastry.prototype.lookupTypeByExtension = function(ext) {
  return pastry.extensionMap[ext] || ext;
};

// Add line numbers to the document
// For the specified number of lines
pastry.prototype.addLineNumbers = function(lineCount) {
  var h = '';
  for (var i = 0; i < lineCount; i++) {
    h += (i + 1).toString() + '<br/>';
  }
  $('#linenos').html(h);
};

// Remove the line numbers
pastry.prototype.removeLineNumbers = function() {
  $('#linenos').html('&gt;');
};

// Load a document and show it
pastry.prototype.loadDocument = function(key) {
  // Split the key up
  var parts = key.split('.', 2);
  // Ask for what we want
  var _this = this;
  _this.doc = new pastry_document();
  _this.doc.load(key, function(ret) {
    if (ret) {
      _this.$code.html(ret.value);
      _this.setTitle(ret.key);
      _this.fullKey();
      _this.$textarea.val('').hide();
      _this.$box.show();
      _this.addLineNumbers(ret.lineCount);
    }
    else {
      _this.newDocument();
    }
  }, this.lookupTypeByExtension(parts[1]));
};

// Delete the current document - only if locked
pastry.prototype.deleteDocument = function() {
  var _this = this;
  if (this.doc.locked) {
    this.doc.delete(function(err) {
      if (!err) {
        window.history.pushState(null, _this.appName, window.location.pathname);
        _this.newDocument();
        _this.getDocuments();
      } else {
        _this.showMessage(err.message, 'error');
      }
    });
  }
};

// Duplicate the current document - only if locked
pastry.prototype.duplicateDocument = function() {
  if (this.doc.locked) {
    var currentData = this.doc.data;
    this.newDocument();
    this.$textarea.val(currentData);
  }
};

// Lock the current document
pastry.prototype.lockDocument = function() {
  var _this = this;
  this.doc.save(this.$doctitle.val(), this.$textarea.val(), function(err, ret) {
    if (err) {
      _this.showMessage(err.message, 'error');
    }
    else if (ret) {
      _this.$code.html(ret.value);
      _this.setTitle(ret.key);
      window.history.pushState(null, _this.appName + '-' + ret.key, window.location.pathname + "?" + ret.key);
      _this.fullKey();
      _this.$textarea.val('').hide();
      _this.$box.show();
      _this.addLineNumbers(ret.lineCount);
      _this.getDocuments();
    }
  });
};

pastry.prototype.configureButtons = function() {
  var _this = this;
  this.buttons = [
    {
      $where: $('#box2 .save'),
      label: 'Save',
      shortcutDescription: 'control + s',
      shortcut: function(evt) {
        return evt.ctrlKey && (evt.keyCode === 83);
      },
      action: function() {
        if (_this.$textarea.val().replace(/^\s+|\s+$/g, '') !== '') {
          _this.lockDocument();
          _this.$titlebox.hide();
        }
      }
    },
    {
      $where: $('#box2 .new'),
      label: 'New',
      shortcut: function(evt) {
        return evt.ctrlKey && evt.keyCode === 78  
      },
      shortcutDescription: 'control + n',
      action: function() {
        _this.newDocument(!_this.doc.key);
      }
    },
    {
      $where: $('#box2 .duplicate'),
      label: 'Duplicate & Edit',
      shortcut: function(evt) {
        return _this.doc.locked && evt.ctrlKey && evt.keyCode === 68;
      },
      shortcutDescription: 'control + d',
      action: function() {
        _this.duplicateDocument();
      }
    },
    {
      $where: $('#box2 .delete'),
      label: 'Delete',
      action: function() {
        _this.deleteDocument();
      }
    },
    {
      $where: $('#box2 .raw'),
      label: 'Just Text',
      shortcut: function(evt) {
        return evt.ctrlKey && evt.shiftKey && evt.keyCode === 82;
      },
      shortcutDescription: 'control + shift + r',
      action: function() {
        window.location.href = '/pastry/pastes/' + _this.doc.key;
      }
    }
  ];
  for (var i = 0; i < this.buttons.length; i++) {
    this.configureButton(this.buttons[i]);
  }
};

pastry.prototype.configureButton = function(options) {
  // Handle the click action
  options.$where.click(function(evt) {
    evt.preventDefault();
    if (!options.clickDisabled && $(this).hasClass('enabled')) {
      options.action();
    }
  });
  // Show the label
  options.$where.mouseenter(function(evt) {
    $('#box3 .label').text(options.label);
    $('#box3 .shortcut').text(options.shortcutDescription || '');
    $('#box3').show();
    $(this).append($('#pointer').remove().show());
  });
  // Hide the label
  options.$where.mouseleave(function(evt) {
    $('#box3').hide();
    $('#pointer').hide();
  });
};

// Configure keyboard shortcuts for the textarea
pastry.prototype.configureShortcuts = function() {
  var _this = this;
  $(document.body).keydown(function(evt) {
    var button;
    for (var i = 0 ; i < _this.buttons.length; i++) {
      button = _this.buttons[i];
      if (button.shortcut && button.shortcut(evt)) {
        evt.preventDefault();
        button.action();
        return;
      }
    }
  });
};

///// Tab behavior in the textarea - 2 spaces per tab
$(function() {

  $('textarea').keydown(function(evt) {
    if (evt.keyCode === 9) {
      evt.preventDefault();
      var myValue = '  ';
      // http://stackoverflow.com/questions/946534/insert-text-into-textarea-with-jquery
      // For browsers like Internet Explorer
      if (document.selection) {
        this.focus();
        sel = document.selection.createRange();
        sel.text = myValue;
        this.focus();
      }
      // Mozilla and Webkit
      else if (this.selectionStart || this.selectionStart == '0') {
        var startPos = this.selectionStart;
        var endPos = this.selectionEnd;
        var scrollTop = this.scrollTop;
        this.value = this.value.substring(0, startPos) + myValue +
          this.value.substring(endPos,this.value.length);
        this.focus();
        this.selectionStart = startPos + myValue.length;
        this.selectionEnd = startPos + myValue.length;
        this.scrollTop = scrollTop;
      }
      else {
        this.value += myValue;
        this.focus();
      }
    }
  });

});
