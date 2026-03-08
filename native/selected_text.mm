#include <napi.h>
#import <ApplicationServices/ApplicationServices.h>
#import <Foundation/Foundation.h>

Napi::Value GetSelectedText(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Get the system-wide accessibility element
  AXUIElementRef sysWide = AXUIElementCreateSystemWide();

  // Get the focused UI element
  AXUIElementRef focused = NULL;
  AXError err = AXUIElementCopyAttributeValue(
    sysWide,
    kAXFocusedUIElementAttribute,
    (CFTypeRef*)&focused
  );
  CFRelease(sysWide);

  if (err != kAXErrorSuccess || !focused) {
    return env.Null();
  }

  // Get the selected text from the focused element
  CFTypeRef selectedText = NULL;
  err = AXUIElementCopyAttributeValue(
    focused,
    kAXSelectedTextAttribute,
    &selectedText
  );
  CFRelease(focused);

  if (err != kAXErrorSuccess || !selectedText) {
    return env.Null();
  }

  // Verify it's a string
  if (CFGetTypeID(selectedText) != CFStringGetTypeID()) {
    CFRelease(selectedText);
    return env.Null();
  }

  // Convert CFString to std::string
  CFStringRef cfStr = (CFStringRef)selectedText;
  CFIndex length = CFStringGetLength(cfStr);
  if (length == 0) {
    CFRelease(selectedText);
    return env.Null();
  }

  CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
  char* buffer = new char[maxSize];
  Boolean success = CFStringGetCString(cfStr, buffer, maxSize, kCFStringEncodingUTF8);
  CFRelease(selectedText);

  if (!success) {
    delete[] buffer;
    return env.Null();
  }

  Napi::String result = Napi::String::New(env, buffer);
  delete[] buffer;
  return result;
}

Napi::Value GetFieldValue(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Get the system-wide accessibility element
  AXUIElementRef sysWide = AXUIElementCreateSystemWide();

  // Get the focused UI element
  AXUIElementRef focused = NULL;
  AXError err = AXUIElementCopyAttributeValue(
    sysWide,
    kAXFocusedUIElementAttribute,
    (CFTypeRef*)&focused
  );
  CFRelease(sysWide);

  if (err != kAXErrorSuccess || !focused) {
    return env.Null();
  }

  // Get the full field value from the focused element
  CFTypeRef fieldValue = NULL;
  err = AXUIElementCopyAttributeValue(
    focused,
    kAXValueAttribute,
    &fieldValue
  );
  CFRelease(focused);

  if (err != kAXErrorSuccess || !fieldValue) {
    return env.Null();
  }

  // Verify it's a string
  if (CFGetTypeID(fieldValue) != CFStringGetTypeID()) {
    CFRelease(fieldValue);
    return env.Null();
  }

  // Convert CFString to std::string
  CFStringRef cfStr = (CFStringRef)fieldValue;
  CFIndex length = CFStringGetLength(cfStr);
  if (length == 0) {
    CFRelease(fieldValue);
    return env.Null();
  }

  CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
  char* buffer = new char[maxSize];
  Boolean success = CFStringGetCString(cfStr, buffer, maxSize, kCFStringEncodingUTF8);
  CFRelease(fieldValue);

  if (!success) {
    delete[] buffer;
    return env.Null();
  }

  Napi::String result = Napi::String::New(env, buffer);
  delete[] buffer;
  return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("getSelectedText", Napi::Function::New(env, GetSelectedText));
  exports.Set("getFieldValue", Napi::Function::New(env, GetFieldValue));
  return exports;
}

NODE_API_MODULE(selected_text, Init)
