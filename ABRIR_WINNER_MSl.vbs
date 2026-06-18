' WINNER STORE - Lanzador Silencioso
' Este script ejecuta el sistema sin abrir ventanas de consola.

Set WshShell = CreateObject("WScript.Shell")

' Obtener la ruta del directorio actual del script de forma dinámica
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
batPath = strPath & "\INICIAR_WINNER.bat"

' Ejecuta el .bat con estilo de ventana 0 (oculto)
' Cambiamos a False para que el proceso VBS termine apenas lance el servidor
WshShell.Run "cmd /c """ & batPath & """", 0, False

Set WshShell = Nothing