var typedefName = ''
var parsedStructToJSON = {
  typedefName: 'System_message',
  rawTypeName: 'struct system_message_s',
  varToType:{
    fd: "int",
    index: "int",
    index_str: "char*",
    dimensions: "char**"
  }
}
var findStruct = function(array, from){
  var score = 0
  var deep = 0
  var position = from
  var openBracketPosition = 0
  var varToType = {}
  var subKey = ''
  while(position < array.length){
    if(array[position] == '{'){
      if(score === 0){
        openBracketPosition = position
        subKey = array.slice(from, position).join('')
        varToType[subKey] = {}
      }
      // else {
      //   varToType['key' + score] = findStruct(array, position) //todo recursive call to get possible enums
      // }
      score++
    } else if(array[position] == '}'){
      score--
      if(score == 0){
        varToType[subKey] = array.slice(openBracketPosition + 1, position).join('')
        break;
      }
    }
    position++
  }
  typedefName = array.slice(position + 1, array.length - 1).join('').replace(' ', '')
  var structInfo = {
    typedefName : typedefName,
    varToType: varToType
  }
  return structInfo
}

function identifyKeywords(struct){
  var charArray = struct.split('')
  var typeNames = ['int', 'char', 'char*'] //todo unhardcode *'s
  var typedefToTypeName = {}
  var finalStruct = findStruct(charArray, 0)
  Object.keys(finalStruct.varToType).forEach(function(keys){
    typeNames.push(keys.split("typedef")[1])
    // finalStruct[keys]
  })

  console.log('finalStruct')
  console.log(JSON.stringify(finalStruct, null, 2))
  // console.log('typedefName')
  // console.log(typedefName)
  // console.log('typeNames')
  // console.log(typeNames)
  return finalStruct
}
// identifyKeywords(test1)
var getStructType = function(rawJSON){
  return rawJSON.typedefName
}
var append = function(input, mainStr){
  return input + mainStr
}
var typeToParser = function(type){
  var retVal
  switch(type){
    case('int'):
      retVal = 'itoa'
      break;
    case('char*'):
      retVal = 'char_ptr_to_a'
      break;
    case('char**'):
      retVal = 'char_ptr_ptr_to_a'
      break;
    case('char'):
      retVal = 'char_to_a'
      break;
    default:
      retVal = 'unknown'
      break;
  }
  return retVal
}
var buildFunction = function (functionName, functionArguments){
  var fun = ''+functionName
  fun = append(fun, '(')
  functionArguments.forEach(function(arg){
    fun = append(fun, arg)
  })
  fun = append(fun, ')')
  return fun
}
var buildStructSerializer = function (parsedStructToJSON){
  console.log(parsedStructToJSON)
  //function beginning
  var fullFunction = ''
  fullFunction = append(fullFunction, 'sds serialize___STRUCT_TYPE__(__STRUCT_TYPE__* __INPUT_STRUCT__){\n')
  fullFunction = append(fullFunction, '\tsds serialized___STRUCT_TYPE__ = sdsnew("\"{\"");\n')


  //function ending
  var finalizeFunction = ''
  finalizeFunction = append(finalizeFunction, '\tserialized___STRUCT_TYPE__ = sdscat(serialized___STRUCT_TYPE__, "\"}\"");\n')
  finalizeFunction = append(finalizeFunction, '\treturn serialized___STRUCT_TYPE__;\n')
  finalizeFunction = append(finalizeFunction, '}')

  //guts
  var variableNames = Object.keys(parsedStructToJSON.varToType)
  var keysAndValuesStr = ''
  variableNames.forEach(function(varName, index){
    keysAndValuesStr = append(keysAndValuesStr, '\tserialized___STRUCT_TYPE__ = sdscat(serialized___STRUCT_TYPE__, ')
    keysAndValuesStr = append(keysAndValuesStr, '"' + (index ? ',' : '') + varName +':");\n')
    keysAndValuesStr = append(keysAndValuesStr, '\tserialized___STRUCT_TYPE__ = sdscat(serialized___STRUCT_TYPE__, ')
    keysAndValuesStr = append(keysAndValuesStr, buildFunction(typeToParser(parsedStructToJSON.varToType[varName]), ['__INPUT_STRUCT__->' + varName]))
    keysAndValuesStr = append(keysAndValuesStr, ');\n')
  })
  fullFunction = append(fullFunction, keysAndValuesStr)

  //pos processing ==>> replace a few fieds
  var structType = getStructType(parsedStructToJSON)
  var inputStruct = append('input_', structType)
  var finalResult = append(fullFunction, finalizeFunction)
  finalResult = finalResult.replace(/__STRUCT_TYPE__/g, structType)
  finalResult = finalResult.replace(/__INPUT_STRUCT__/g, inputStruct)
  return finalResult
}

console.log(buildStructSerializer(parsedStructToJSON))
